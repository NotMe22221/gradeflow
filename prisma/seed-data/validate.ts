// Self-checks for the demo dataset. Pure: no database access. The seed runs
// them before deleting anything, so a typo in a paper, rubric, quiz answer,
// or XP plan fails loudly instead of seeding an inconsistent demo.

import { findEvidenceSpan } from "../../src/lib/grading/evidence";
import {
  computeStreak,
  dayKey,
  levelFor,
  ONCE_PER_DAY,
  totalXp,
  xpForPublishedGrade,
  type StreakInfo,
} from "../../src/lib/gamification/rules";
import { letterToPercent } from "../../src/lib/goals/plan";
import { SAMPLE_TEST_PHOTOS } from "../../src/lib/scan/samples";
import {
  assignmentByKey,
  PENDING,
  PUBLISHED,
  publishedTotals,
  submissionKey,
  TERM_START,
  type SeedPublished,
} from "./dataset";
import { buildActivities, STUDENT_GOALS, type SeedActivity } from "./engagement";
import { sum, type Clock } from "./helpers";
import { CLASSES, STUDENTS, type ClassKey, type StudentKey } from "./people";
import { ASSIGNMENTS, type AssignmentKey } from "./rubrics";

/** Scores are whole or half points, as the review form and publish enforce. */
function isHalfStep(value: number): boolean {
  return Number.isInteger(value * 2);
}

function isEnrolled(studentKey: StudentKey, classKey: ClassKey): boolean {
  return CLASSES.find((klass) => klass.key === classKey)?.studentKeys.includes(studentKey) ?? false;
}

function rosterOf(classKey: ClassKey): StudentKey[] {
  return CLASSES.find((klass) => klass.key === classKey)?.studentKeys ?? [];
}

function studentByName(name: string) {
  return STUDENTS.find((student) => student.name === name);
}

/** Mean percent earned on one question across the approved grades for an assignment. */
export function questionAverage(assignmentKey: AssignmentKey, criterionKey: string): number | null {
  const criterion = assignmentByKey(assignmentKey).criteria.find((candidate) => candidate.key === criterionKey);
  const records = PUBLISHED.filter((record) => record.assignmentKey === assignmentKey);
  if (!criterion || records.length === 0) return null;
  const earned = sum(records.map((record) => record.scores[criterionKey]?.finalScore ?? 0));
  return (earned / (criterion.maxPoints * records.length)) * 100;
}

export type EngagementSnapshot = { xp: number; level: number; streak: StreakInfo; lastActive: Date | null };

/** What the student dashboard will show for a student, from the planned XP rows. */
export function engagementFor(activities: SeedActivity[], studentKey: StudentKey, now: Date): EngagementSnapshot {
  const rows = activities.filter((activity) => activity.studentKey === studentKey);
  const xp = totalXp(rows);
  return {
    xp,
    level: levelFor(xp).level,
    streak: computeStreak(
      rows.map((row) => row.at),
      now
    ),
    lastActive: rows.length > 0 ? rows[rows.length - 1].at : null,
  };
}

function checkSubmissions(problems: string[]) {
  const seen = new Set<string>();
  for (const submission of [...PENDING, ...PUBLISHED]) {
    const assignment = assignmentByKey(submission.assignmentKey);
    const pair = submissionKey(submission.assignmentKey, submission.studentKey);
    if (seen.has(pair)) problems.push(`${pair}: duplicate submission.`);
    seen.add(pair);
    if (!isEnrolled(submission.studentKey, assignment.classKey)) {
      problems.push(`${pair}: student is not enrolled in ${assignment.classKey}.`);
    }
    if (submission.submittedAt.daysAgo < 1) problems.push(`${pair}: submittedAt must be at least a day ago.`);
    if (submission.submittedAt.daysAgo > assignment.createdDaysAgo) {
      problems.push(`${pair}: submitted before the assignment was created.`);
    }
  }
}

function checkPublished(problems: string[], clock: Clock, record: SeedPublished) {
  const pair = submissionKey(record.assignmentKey, record.studentKey);
  const assignment = assignmentByKey(record.assignmentKey);
  const criteria = assignment.criteria;
  const rubricKeys = criteria.map((criterion) => criterion.key);
  const extra = Object.keys(record.scores).filter((key) => !rubricKeys.includes(key));
  if (extra.length > 0) problems.push(`${pair}: scores for unknown criteria ${extra.join(", ")}.`);
  if ((record.source === "SCAN") !== (assignment.kind === "TEST")) {
    problems.push(`${pair}: ${record.source} submissions belong to ${record.source === "SCAN" ? "TEST" : "ESSAY"} assignments.`);
  }

  const submittedAt = clock.at(record.submittedAt).getTime();
  const aiGradedAt = clock.at(record.aiGradedAt).getTime();
  const approvedAt = clock.at(record.approvedAt).getTime();
  if (!(submittedAt <= aiGradedAt && aiGradedAt <= approvedAt)) {
    problems.push(`${pair}: expected submitted <= AI graded <= approved.`);
  }
  if (record.approvedAt.daysAgo < 1) problems.push(`${pair}: approvedAt must be at least a day ago.`);

  const lines = record.content.split("\n");
  let adjusted = false;
  criteria.forEach((criterion, index) => {
    const score = record.scores[criterion.key];
    if (!score) {
      problems.push(`${pair}: missing a score for "${criterion.key}".`);
      return;
    }
    for (const [label, value] of [
      ["aiScore", score.aiScore],
      ["finalScore", score.finalScore],
    ] as const) {
      if (!Number.isFinite(value) || value < 0 || value > criterion.maxPoints || !isHalfStep(value)) {
        problems.push(`${pair}/${criterion.key}: ${label} ${value} is not a half-point step in 0-${criterion.maxPoints}.`);
      }
    }
    if (score.aiScore !== score.finalScore) {
      adjusted = true;
      if (!score.finalComment?.trim()) problems.push(`${pair}/${criterion.key}: an adjusted score needs a teacher comment.`);
    }
    // The quote must be a verbatim substring AND pass the app's own matcher,
    // so the review and student views highlight it exactly.
    const span = findEvidenceSpan(record.content, score.aiEvidence);
    if (!record.content.includes(score.aiEvidence) || !span) {
      problems.push(`${pair}/${criterion.key}: evidence is not a verbatim quote from the paper.`);
      return;
    }
    if (record.source === "SCAN") {
      // A quiz quote must land on its own question's line.
      const lineIndex = record.content.slice(0, span.start).split("\n").length - 1;
      if (!lines[lineIndex]?.startsWith(`Q${index + 1}. `)) {
        problems.push(`${pair}/${criterion.key}: evidence is not on the Q${index + 1} line.`);
      }
    }
  });
  if (record.requireAdjustment && !adjusted) problems.push(`${pair}: the teacher review should adjust at least one score.`);
  if (record.source === "SCAN" && lines.length !== criteria.length) {
    problems.push(`${pair}: the transcription has ${lines.length} lines for ${criteria.length} questions.`);
  }
}

function checkAssignments(problems: string[]) {
  for (const assignment of ASSIGNMENTS) {
    if (!(sum(assignment.criteria.map((criterion) => criterion.maxPoints)) > 0)) {
      problems.push(`${assignment.key}: the rubric has no points.`);
    }
    if (new Set(assignment.criteria.map((criterion) => criterion.key)).size !== assignment.criteria.length) {
      problems.push(`${assignment.key}: duplicate criterion keys.`);
    }
    for (const [index, criterion] of assignment.criteria.entries()) {
      if (!Number.isInteger(criterion.maxPoints) || criterion.maxPoints < 1) {
        problems.push(`${assignment.key}/${criterion.key}: maxPoints must be a whole number of at least 1.`);
      }
      if (assignment.kind === "TEST" && !criterion.title.startsWith(`Q${index + 1}. `)) {
        problems.push(`${assignment.key}/${criterion.key}: a test question title starts with "Q${index + 1}. ".`);
      }
    }
    // Quizzes with history keep the "occasional teacher adjustment" story.
    const records = PUBLISHED.filter((record) => record.assignmentKey === assignment.key && !record.requireAdjustment);
    if (
      records.length > 0 &&
      !records.some((record) => Object.values(record.scores).some((score) => score.aiScore !== score.finalScore))
    ) {
      problems.push(`${assignment.key}: the teacher should adjust at least one AI score across the class.`);
    }
  }
}

/** The demo flows depend on these exact shapes. */
function checkStory(problems: string[]) {
  const expectShape = (key: AssignmentKey, kind: "ESSAY" | "TEST", points: number[], dueInDays: number) => {
    const assignment = assignmentByKey(key);
    const actual = assignment.criteria.map((criterion) => criterion.maxPoints);
    if (assignment.kind !== kind) problems.push(`${key}: expected a ${kind} assignment.`);
    if (actual.join(",") !== points.join(",")) problems.push(`${key}: expected points ${points.join(", ")}, got ${actual.join(", ")}.`);
    if (assignment.dueInDays !== dueInDays) problems.push(`${key}: expected a due date ${dueInDays} days from today.`);
  };
  const submissionsFor = (key: AssignmentKey) => [...PENDING, ...PUBLISHED].filter((record) => record.assignmentKey === key);
  const expectPublishedForRoster = (key: AssignmentKey) => {
    const roster = rosterOf(assignmentByKey(key).classKey);
    const graded = PUBLISHED.filter((record) => record.assignmentKey === key).map((record) => record.studentKey);
    const missing = roster.filter((studentKey) => !graded.includes(studentKey));
    if (missing.length > 0) problems.push(`${key}: no published grade for ${missing.join(", ")}.`);
  };
  const expectAverage = (key: AssignmentKey, criterionKey: string, test: (value: number) => boolean, rule: string) => {
    const average = questionAverage(key, criterionKey);
    if (average === null || !test(average)) {
      problems.push(`${key}/${criterionKey}: class average ${average?.toFixed(1) ?? "n/a"}% should be ${rule}.`);
    }
  };

  // English 10: Q5 and Q7 commonly missed, Q1 and Q2 mostly correct (16 points).
  expectShape("grammarQuiz1", "TEST", [2, 2, 2, 2, 2, 1, 3, 2], -18);
  expectPublishedForRoster("grammarQuiz1");
  for (const key of ["q5", "q7"]) expectAverage("grammarQuiz1", key, (value) => value < 50, "under 50%");
  for (const key of ["q1", "q2"]) expectAverage("grammarQuiz1", key, (value) => value >= 80, "at least 80%");

  // English 10: an upcoming essay for the goal planner (30 points, no submissions).
  expectShape("finalPortfolio", "ESSAY", [12, 10, 8], 14);
  if (submissionsFor("finalPortfolio").length > 0) problems.push("finalPortfolio: should have no submissions.");

  // Environmental Science: Q4 is the most missed question (15 points).
  expectShape("waterCycleQuiz", "TEST", [2, 2, 2, 3, 3, 3], -12);
  expectPublishedForRoster("waterCycleQuiz");
  expectAverage("waterCycleQuiz", "q4", (value) => value < 50, "under 50%");
  const water = assignmentByKey("waterCycleQuiz").criteria.map((criterion) => questionAverage("waterCycleQuiz", criterion.key) ?? 0);
  if (Math.min(...water) !== water[3]) problems.push("waterCycleQuiz: Q4 should be the most missed question.");

  // Environmental Science: scanned live from the sample photos (20 points, no submissions).
  expectShape("unit3Quiz", "TEST", [3, 4, 4, 4, 5], -1);
  if (submissionsFor("unit3Quiz").length > 0) problems.push("unit3Quiz: should have no submissions; the judge scans it live.");

  // Every sample photo must match a seeded test and an enrolled student.
  for (const sample of SAMPLE_TEST_PHOTOS) {
    const matches = ASSIGNMENTS.filter((assignment) => assignment.title === sample.assignmentTitle);
    if (matches.length !== 1) {
      problems.push(`sample ${sample.id}: expected one assignment titled "${sample.assignmentTitle}", found ${matches.length}.`);
      continue;
    }
    const assignment = matches[0];
    if (assignment.kind !== "TEST") problems.push(`sample ${sample.id}: "${assignment.title}" must be a TEST.`);
    const student = studentByName(sample.studentName);
    if (!student) problems.push(`sample ${sample.id}: no student named ${sample.studentName}.`);
    else if (!isEnrolled(student.key, assignment.classKey)) {
      problems.push(`sample ${sample.id}: ${sample.studentName} is not enrolled in ${assignment.classKey}.`);
    }
    const numbers = sample.transcription
      .split("\n")
      .map((line) => /^Q(\d+)\./.exec(line)?.[1])
      .filter((value): value is string => Boolean(value))
      .map(Number);
    if (numbers.join(",") !== assignment.criteria.map((_, index) => index + 1).join(",")) {
      problems.push(
        `sample ${sample.id}: answers Q${numbers.join(", Q")} do not match the ${assignment.criteria.length} questions of "${assignment.title}".`
      );
    }
  }
}

function checkEngagement(problems: string[], clock: Clock, activities: SeedActivity[]) {
  const termStart = clock.at(TERM_START).getTime();
  const seenOncePerDay = new Set<string>();
  const submissions = new Set([...PENDING, ...PUBLISHED].map((record) => submissionKey(record.assignmentKey, record.studentKey)));

  for (const activity of activities) {
    const label = `${activity.studentKey}/${activity.kind}@${activity.at.toISOString()}`;
    const time = activity.at.getTime();
    if (time > clock.now.getTime() || time < termStart) problems.push(`${label}: outside the term (or in the future).`);
    if (!(Number.isInteger(activity.xp) && activity.xp >= 0)) problems.push(`${label}: XP must be a whole number.`);
    if (ONCE_PER_DAY.includes(activity.kind)) {
      const key = `${activity.studentKey}/${activity.kind}/${dayKey(activity.at)}`;
      if (seenOncePerDay.has(key)) problems.push(`${label}: ${activity.kind} can be earned once per day.`);
      seenOncePerDay.add(key);
    }
    const ref = activity.ref;
    if (ref.type === "submission") {
      if (ref.studentKey !== activity.studentKey || !submissions.has(submissionKey(ref.assignmentKey, ref.studentKey))) {
        problems.push(`${label}: refers to a submission that is not seeded for this student.`);
      }
    } else if (ref.type === "assignment") {
      const assignment = assignmentByKey(ref.assignmentKey);
      const createdAt = clock.at({ daysAgo: assignment.createdDaysAgo, hour: 7, minute: 45 }).getTime();
      if (!isEnrolled(activity.studentKey, assignment.classKey)) problems.push(`${label}: not enrolled in ${assignment.classKey}.`);
      if (createdAt > time) problems.push(`${label}: studied ${ref.assignmentKey} before it was created.`);
    } else if (!isEnrolled(activity.studentKey, ref.classKey)) {
      problems.push(`${label}: not enrolled in ${ref.classKey}.`);
    }
  }

  // The published-grade XP must match the approved snapshot.
  for (const record of PUBLISHED) {
    const { total, max } = publishedTotals(record);
    const rows = activities.filter(
      (activity) =>
        activity.kind === "GRADE_PUBLISHED" &&
        activity.ref.type === "submission" &&
        activity.ref.assignmentKey === record.assignmentKey &&
        activity.studentKey === record.studentKey
    );
    if (rows.length !== 1 || rows[0].xp !== xpForPublishedGrade(total, max)) {
      problems.push(`${submissionKey(record.assignmentKey, record.studentKey)}: GRADE_PUBLISHED XP does not match the grade.`);
    }
  }

  const ava = engagementFor(activities, "ava", clock.now);
  if (ava.xp < 600 || ava.xp > 700) problems.push(`ava: ${ava.xp} XP, expected 600-700.`);
  if (ava.streak.current !== 4 || ava.streak.activeToday) {
    problems.push(`ava: a ${ava.streak.current}-day streak (active today: ${ava.streak.activeToday}), expected 4 ending yesterday.`);
  }

  const milo = engagementFor(activities, "milo", clock.now);
  const threeDaysAgo = dayKey(clock.at({ daysAgo: 3, hour: 12, minute: 0 }));
  if (milo.streak.current !== 0) problems.push(`milo: expected a broken streak, got ${milo.streak.current} days.`);
  if (!milo.lastActive || dayKey(milo.lastActive) !== threeDaysAgo) problems.push("milo: last activity should be 3 days ago.");

  for (const goal of STUDENT_GOALS) {
    const label = `goal ${goal.studentKey}/${goal.classKey}`;
    if (!isEnrolled(goal.studentKey, goal.classKey)) problems.push(`${label}: not enrolled.`);
    if (letterToPercent(goal.targetLabel) !== goal.targetPercent) problems.push(`${label}: ${goal.targetLabel} is not ${goal.targetPercent}%.`);
    if (clock.at(goal.createdAt) > clock.at(goal.updatedAt)) problems.push(`${label}: updated before it was created.`);
    const saved = activities.some(
      (activity) =>
        activity.kind === "GOAL_SET" &&
        activity.studentKey === goal.studentKey &&
        activity.at.getTime() === clock.at(goal.updatedAt).getTime()
    );
    if (!saved) problems.push(`${label}: no GOAL_SET XP when the goal was saved.`);
  }
}

/** Throws with every problem found; returns the planned XP rows when the dataset is consistent. */
export function validateDataset(clock: Clock): SeedActivity[] {
  const problems: string[] = [];
  checkSubmissions(problems);
  for (const record of PUBLISHED) checkPublished(problems, clock, record);
  checkAssignments(problems);
  checkStory(problems);

  let activities: SeedActivity[] = [];
  try {
    activities = buildActivities(clock);
    checkEngagement(problems, clock, activities);
  } catch (error) {
    problems.push(error instanceof Error ? error.message : String(error));
  }

  if (problems.length > 0) {
    throw new Error(`The demo dataset is inconsistent:\n  - ${problems.join("\n  - ")}`);
  }
  return activities;
}
