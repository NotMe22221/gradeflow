import "server-only";

import { cache } from "react";

import { isAwaitingScan, isOverdue, studentStateFor } from "@/components/student/student-status";
import { dueWhen, relativeDue, type DueWhen, type StudentWorkRow } from "@/components/student/todo-model";
import { parseAssignmentKind } from "@/lib/constants";
import { db } from "@/lib/db";
import { demoCoachingTip } from "@/lib/goals/coaching";
import { planGoal } from "@/lib/goals/plan";
import { loadSavedGoals } from "@/lib/goals/query";
import type { GoalClass, GoalPlanView } from "@/lib/goals/types";
import { buildGoalClass, buildPlanView } from "@/lib/goals/view";
import { idSchema } from "@/lib/validation/id";

/** A class the student is enrolled in, as their Home and class pages show it. */
export type StudentClass = {
  id: string;
  name: string;
  section: string | null;
  subject: string | null;
  teacherName: string;
};

/**
 * One assignment from the student's side, with its due labels ("Due
 * tomorrow", "Test on Friday", and "Tue, Oct 27") computed here with the
 * request's `now` in the viewer's time zone, so every list reads the same and
 * the browser never recomputes them.
 */
export type StudentWorkItem = StudentWorkRow & {
  dueText: string;
  /** The same due date said two ways: "Due in 9 days" and "Mon, Nov 9". */
  due: DueWhen;
};

export type StudentWorkData = {
  classes: StudentClass[];
  /** One row per assignment in those classes, with this student's own status. */
  rows: StudentWorkItem[];
  goalClasses: GoalClass[];
};

/** Kept for the Home page: the same data under its original names. */
export type StudentDashboardData = {
  classes: StudentClass[];
  inbox: StudentWorkItem[];
  goalClasses: GoalClass[];
};

function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

/**
 * The student's classes and work, for the signed-in student only: their
 * enrollments, each class's assignments, their own submission status, and
 * teacher-approved PublishedGrade totals and breakdowns. No AI suggestion,
 * confidence, flag, draft edit, or other student's work is ever selected.
 * With `classId`, only that class (and only if the student is enrolled).
 * `timeZone` is the viewer's (viewerTimeZone()): "today" for the relative due
 * labels and the past-due rule (undefined: the server's zone).
 */
export async function loadStudentWork(
  studentId: string,
  now: Date,
  { classId, timeZone }: { classId?: string; timeZone?: string } = {}
): Promise<StudentWorkData> {
  const enrollments = await db.enrollment.findMany({
    where: { studentId, ...(classId ? { classId } : {}) },
    orderBy: { class: { createdAt: "asc" } },
    select: {
      class: {
        select: {
          id: true,
          name: true,
          section: true,
          subject: true,
          teacher: { select: { name: true } },
          assignments: {
            orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
            select: {
              id: true,
              title: true,
              kind: true,
              dueDate: true,
              createdAt: true,
              criteria: { orderBy: { position: "asc" }, select: { id: true, title: true, maxPoints: true } },
              submissions: {
                where: { studentId },
                take: 1,
                select: {
                  status: true,
                  submittedAt: true,
                  returnedAt: true,
                  publishedGrade: {
                    select: { totalScore: true, maxScore: true, breakdown: true, publishedAt: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const classes: StudentClass[] = [];
  const rows: StudentWorkItem[] = [];
  const goalClasses: GoalClass[] = [];

  for (const { class: klass } of enrollments) {
    classes.push({
      id: klass.id,
      name: klass.name,
      section: klass.section,
      subject: klass.subject,
      teacherName: klass.teacher.name,
    });

    for (const assignment of klass.assignments) {
      const submission = assignment.submissions[0] ?? null;
      const published = submission?.publishedGrade ?? null;
      const state = studentStateFor(submission?.status, published !== null);
      const kind = parseAssignmentKind(assignment.kind);
      const dueDate = iso(assignment.dueDate);
      rows.push({
        id: assignment.id,
        title: assignment.title,
        classId: klass.id,
        className: klass.name,
        kind,
        dueDate,
        dueText: relativeDue({ dueDate, kind }, now, timeZone),
        due: dueWhen({ dueDate, kind }, now, timeZone),
        submittedAt: iso(submission?.submittedAt),
        publishedAt: iso(published?.publishedAt),
        // A paper test is never overdue: the student can't submit one.
        pastDue: isOverdue(kind, state, assignment.dueDate, now, timeZone),
        awaitingScan: isAwaitingScan(kind, state, assignment.dueDate, now, timeZone),
        state,
        score: published ? { total: published.totalScore, max: published.maxScore } : null,
        totalPoints: assignment.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0),
        criteria: assignment.criteria,
        postedAt: assignment.createdAt.toISOString(),
        returnedAt: iso(submission?.returnedAt),
      });
    }

    goalClasses.push(
      buildGoalClass(
        {
          id: klass.id,
          name: klass.name,
          section: klass.section,
          subject: klass.subject,
          assignments: klass.assignments.map((assignment) => {
            const submission = assignment.submissions[0] ?? null;
            return {
              id: assignment.id,
              title: assignment.title,
              kind: assignment.kind,
              dueDate: assignment.dueDate,
              criteria: assignment.criteria,
              submission: submission ? { status: submission.status, published: submission.publishedGrade } : null,
            };
          }),
        },
        now,
        timeZone
      )
    );
  }

  return { classes, rows, goalClasses };
}

/** Everything the student Home shows (class cards, inbox, goal planner). */
export async function loadStudentDashboard(
  studentId: string,
  now: Date,
  timeZone?: string
): Promise<StudentDashboardData> {
  const { classes, rows, goalClasses } = await loadStudentWork(studentId, now, { timeZone });
  return { classes, inbox: rows, goalClasses };
}

/**
 * One class the student is enrolled in, or null. Cached per request so a
 * page's metadata and body share one lookup. The class layout checks the
 * enrollment too; every page checks it again for its own queries.
 */
export const getEnrolledClass = cache(async (studentId: string, classId: string): Promise<StudentClass | null> => {
  const id = idSchema.safeParse(classId);
  if (!id.success) return null;
  const klass = await db.class.findFirst({
    where: { id: id.data, enrollments: { some: { studentId } } },
    select: { id: true, name: true, section: true, subject: true, teacher: { select: { name: true } } },
  });
  if (!klass) return null;
  return {
    id: klass.id,
    name: klass.name,
    section: klass.section,
    subject: klass.subject,
    teacherName: klass.teacher.name,
  };
});

export type Classmate = { id: string; name: string; isYou: boolean };

/**
 * A class's roster as a classmate sees it: names only, never emails or any
 * other student data. Empty unless the student is enrolled in the class.
 */
export async function loadClassmates(studentId: string, classId: string): Promise<Classmate[]> {
  const enrollments = await db.enrollment.findMany({
    where: {
      classId,
      student: { role: "STUDENT" },
      class: { enrollments: { some: { studentId } } },
    },
    orderBy: { student: { name: "asc" } },
    select: { student: { select: { id: true, name: true } } },
  });
  return enrollments.map(({ student }) => ({ id: student.id, name: student.name, isYou: student.id === studentId }));
}

/**
 * The student's saved goals, re-planned against their current approved
 * grades (so a newly published grade updates the numbers). The tip is the
 * built-in template: nothing here is AI output.
 */
export async function loadSavedPlans(studentId: string, goalClasses: GoalClass[]): Promise<GoalPlanView[]> {
  const saved = await loadSavedGoals(studentId);
  const plans: GoalPlanView[] = [];
  for (const goal of saved) {
    const goalClass = goalClasses.find((klass) => klass.id === goal.classId);
    if (!goalClass) continue;
    const plan = planGoal({
      targetPercent: goal.targetPercent,
      completed: goalClass.completed,
      remaining: goalClass.remaining,
    });
    plans.push(
      buildPlanView({
        goalClass,
        goalText: goal.rawText,
        target: { percent: goal.targetPercent, label: goal.targetLabel },
        plan,
        coachingTip: demoCoachingTip(goalClass.weakest, plan.status),
        tipSource: "template",
        savedAt: goal.updatedAt,
      })
    );
  }
  return plans;
}
