// XP history (StudyActivity) and saved grade goals (StudentGoal) for the
// gamified student dashboard and the goal planner. Pure: no database access.
//
// Every XP row is one the running app would have written:
//   SUBMIT + ON_TIME   when a student typed or uploaded a paper (scanned
//                      quizzes earn none: the teacher submits those)
//   GRADE_PUBLISHED    when the teacher approved a grade, scaled by the score
//   STUDY_SESSION      a session logged from the inbox for one assignment
//   GOAL_SET           a goal saved in the planner (refId = the class)
// At most one STUDY_SESSION and one GOAL_SET per student per day, as the app
// enforces. Streaks and levels are computed by the app from these rows.
//
// The demo story: Ava (the demo student) has a 4-day streak that ended
// yesterday, so it is still alive and a judge can log today's study session
// live (+15 XP, streak 5). She is at Level 3 (about 600 XP). Milo's streak is broken: his last activity
// was 3 days ago, when he saved the goal "I need a B" in English 10 and
// submitted his persuasive essay. The seed checks both.

import { isPastDue } from "../../src/components/student/student-status";
import {
  submissionXpAwards,
  xpForPublishedGrade,
  XP_RULES,
  type ActivityKind,
} from "../../src/lib/gamification/rules";
import { assignmentByKey, DRAFTS, PENDING, PUBLISHED, publishedTotals } from "./dataset";
import type { Clock, DaysAgoAt } from "./helpers";
import { CLASSES, STUDENTS, type ClassKey, type StudentKey } from "./people";
import { ASSIGNMENTS, type AssignmentKey, type SeedAssignment } from "./rubrics";

// --- Saved goals -----------------------------------------------------------------

export type SeedGoal = {
  studentKey: StudentKey;
  classKey: ClassKey;
  /** What the student typed in the planner. */
  rawText: string;
  targetPercent: number;
  targetLabel: string;
  /** First saved (GOAL_SET XP that day). */
  createdAt: DaysAgoAt;
  /** Last saved (GOAL_SET XP that day too). */
  updatedAt: DaysAgoAt;
};

/** Milo's saved goal shows when a judge switches to him. Ava starts with none. */
export const STUDENT_GOALS: SeedGoal[] = [
  {
    studentKey: "milo",
    classKey: "english",
    rawText: "I need a B",
    targetPercent: 80,
    targetLabel: "B",
    createdAt: { daysAgo: 10, hour: 19, minute: 12 },
    updatedAt: { daysAgo: 3, hour: 20, minute: 58 },
  },
];

// --- Study sessions --------------------------------------------------------------

function days(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

export type StudyPlan = {
  studentKey: StudentKey;
  /** Days ago with a logged study session (0 is today). */
  studyDays: number[];
  /**
   * Which assignment a day's session was for. By default it is the soonest
   * assignment still open on that day (see studyTarget).
   */
  studyFor?: Partial<Record<number, AssignmentKey>>;
};

export const STUDY_PLANS: StudyPlan[] = [
  // Studied almost daily since Quiz 1 was announced; missed 18 and 5 days ago,
  // and has not studied yet today.
  { studentKey: "ava", studyDays: [...days(1, 4), ...days(6, 17), ...days(19, 35)], studyFor: { 1: "lanternKeeper" } },
  // Last active 3 days ago, so the streak is broken.
  { studentKey: "milo", studyDays: [3, 5, 6, 8, 12, 13, 15, 19, 20, 22] },
  { studentKey: "priya", studyDays: [1, 2, 3, 6, 7, 9, 10, 13, 14, 17, 20] },
  { studentKey: "theo", studyDays: [2, 8, 15, 19] },
  { studentKey: "juniper", studyDays: [...days(0, 6), 8, 9, 11, 12, 14, 16, 18] },
  { studentKey: "sasha", studyDays: [1, 5, 7, 11, 18] },
  { studentKey: "leo", studyDays: [1, 2, 4, 5, 9, 13, 14] },
  { studentKey: "nadia", studyDays: [0, 1, 4, 6, 10, 12, 15] },
  { studentKey: "rafael", studyDays: [6, 13, 14, 17] },
  { studentKey: "iris", studyDays: [0, 1, 2, 4, 5, 7, 8, 9, 13, 16] },
];

function classesOf(studentKey: StudentKey): ClassKey[] {
  return CLASSES.filter((klass) => klass.studentKeys.includes(studentKey)).map((klass) => klass.key);
}

/** Days ago the student turned in a typed paper for this assignment, or null. */
function typedSubmissionDay(assignmentKey: AssignmentKey, studentKey: StudentKey): number | null {
  const typed = [...PENDING, ...DRAFTS, ...PUBLISHED.filter((record) => record.source === "TEXT")].find(
    (record) => record.assignmentKey === assignmentKey && record.studentKey === studentKey
  );
  return typed ? typed.submittedAt.daysAgo : null;
}

/**
 * Whether an assignment was still ahead of the student on a given day: a
 * quiz up to and including the day it was taken in class (its due date), an
 * essay until it was turned in or its due day passed.
 */
function isOpenOn(assignment: SeedAssignment, studentKey: StudentKey, daysAgo: number): boolean {
  if (assignment.createdDaysAgo < daysAgo) return false;
  if (-daysAgo > assignment.dueInDays) return false;
  if (assignment.kind === "TEST") return true;
  const submittedDay = typedSubmissionDay(assignment.key, studentKey);
  return submittedDay === null || submittedDay <= daysAgo;
}

/**
 * The assignment a study session on `daysAgo` was for: the plan's choice, or
 * the open assignment due soonest in the student's classes, or else the most
 * recently created one. Null when no assignment existed yet.
 */
export function studyTarget(plan: StudyPlan, daysAgo: number): AssignmentKey | null {
  const chosen = plan.studyFor?.[daysAgo];
  if (chosen) return chosen;
  const classKeys = classesOf(plan.studentKey);
  const existing = ASSIGNMENTS.filter(
    (assignment) => classKeys.includes(assignment.classKey) && assignment.createdDaysAgo >= daysAgo
  );
  const open = existing
    .filter((assignment) => isOpenOn(assignment, plan.studentKey, daysAgo))
    .sort((a, b) => a.dueInDays - b.dueInDays);
  if (open[0]) return open[0].key;
  const newest = [...existing].sort((a, b) => a.createdDaysAgo - b.createdDaysAgo)[0];
  return newest?.key ?? null;
}

/** A readable, varied after-school time for a past session; earlier today for today. */
function sessionTime(clock: Clock, studentKey: StudentKey, daysAgo: number): Date {
  const index = STUDENTS.findIndex((student) => student.key === studentKey);
  if (daysAgo === 0) return clock.earlierToday(12 + index * 9);
  return clock.at({
    daysAgo,
    hour: 15 + ((daysAgo * 5 + index * 3) % 7),
    minute: (daysAgo * 17 + index * 23) % 60,
  });
}

// --- XP history --------------------------------------------------------------------

export type ActivityRef =
  | { type: "submission"; assignmentKey: AssignmentKey; studentKey: StudentKey }
  | { type: "assignment"; assignmentKey: AssignmentKey }
  | { type: "class"; classKey: ClassKey };

export type SeedActivity = {
  studentKey: StudentKey;
  kind: ActivityKind;
  xp: number;
  at: Date;
  ref: ActivityRef;
};

/** Every XP row for every student, oldest first. */
export function buildActivities(clock: Clock): SeedActivity[] {
  const activities: SeedActivity[] = [];

  // Typed submissions earn SUBMIT, plus ON_TIME before the end of the due day.
  for (const record of [...PENDING, ...DRAFTS, ...PUBLISHED.filter((entry) => entry.source === "TEXT")]) {
    const assignment = assignmentByKey(record.assignmentKey);
    const at = clock.at(record.submittedAt);
    const onTime = !isPastDue(clock.dueInDays(assignment.dueInDays), at);
    for (const award of submissionXpAwards({ resubmission: false, onTime, alreadyAwarded: new Set() })) {
      activities.push({
        studentKey: record.studentKey,
        kind: award.kind,
        xp: award.xp,
        at,
        ref: { type: "submission", assignmentKey: record.assignmentKey, studentKey: record.studentKey },
      });
    }
  }

  // Every published grade earned XP scaled by the approved score, at approval.
  for (const record of PUBLISHED) {
    const { total, max } = publishedTotals(record);
    activities.push({
      studentKey: record.studentKey,
      kind: "GRADE_PUBLISHED",
      xp: xpForPublishedGrade(total, max),
      at: clock.at(record.approvedAt),
      ref: { type: "submission", assignmentKey: record.assignmentKey, studentKey: record.studentKey },
    });
  }

  // Saving a goal earns GOAL_SET (refId = the class), on the first and last save.
  for (const goal of STUDENT_GOALS) {
    const saves = goal.createdAt.daysAgo === goal.updatedAt.daysAgo ? [goal.updatedAt] : [goal.createdAt, goal.updatedAt];
    for (const when of saves) {
      activities.push({
        studentKey: goal.studentKey,
        kind: "GOAL_SET",
        xp: XP_RULES.GOAL_SET,
        at: clock.at(when),
        ref: { type: "class", classKey: goal.classKey },
      });
    }
  }

  // Study sessions logged from the inbox (refId = the assignment).
  for (const plan of STUDY_PLANS) {
    for (const daysAgo of plan.studyDays) {
      const assignmentKey = studyTarget(plan, daysAgo);
      if (!assignmentKey) {
        throw new Error(`${plan.studentKey}: no assignment existed for a study session ${daysAgo} days ago.`);
      }
      activities.push({
        studentKey: plan.studentKey,
        kind: "STUDY_SESSION",
        xp: XP_RULES.STUDY_SESSION,
        at: sessionTime(clock, plan.studentKey, daysAgo),
        ref: { type: "assignment", assignmentKey },
      });
    }
  }

  return activities.sort((a, b) => a.at.getTime() - b.at.getTime());
}
