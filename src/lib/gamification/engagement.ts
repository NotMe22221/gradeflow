import "server-only";

import { db } from "@/lib/db";
import {
  computeStreak,
  dayKey,
  describeActivity,
  levelFor,
  streakDates,
  totalXp,
  type LevelProgress,
  type StreakInfo,
} from "@/lib/gamification/rules";

export type XpEvent = {
  id: string;
  kind: string;
  xp: number;
  /** "Submitted Persuasive Essay". */
  label: string;
  /** ISO timestamp. */
  createdAt: string;
};

export type StudentEngagement = {
  streak: StreakInfo;
  level: LevelProgress;
  totalXp: number;
  /** Newest first. */
  recent: XpEvent[];
  /** Whether today's study session XP has already been earned. */
  studyLoggedToday: boolean;
};

/**
 * Streak, level, and recent XP for the signed-in student, from their own
 * StudyActivity rows. Engagement only: none of this ever touches a grade.
 * Related titles are resolved only from this student's own submissions and
 * the classes they are enrolled in.
 *
 * Every row counts toward XP, but the streak only counts the student's own
 * actions: a grade the teacher publishes is not a study day. Days are the
 * server's calendar days (see rules.ts).
 */
export async function getStudentEngagement(
  studentId: string,
  now: Date = new Date(),
  recentLimit = 5
): Promise<StudentEngagement> {
  const rows = await db.studyActivity.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    select: { id: true, kind: true, xp: true, refId: true, createdAt: true },
  });

  const recentRows = rows.slice(0, recentLimit);
  const refIds = [...new Set(recentRows.map((row) => row.refId).filter((id): id is string => Boolean(id)))];

  const [submissions, assignments, classes] =
    refIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          db.submission.findMany({
            where: { id: { in: refIds }, studentId },
            select: { id: true, assignment: { select: { title: true } } },
          }),
          db.assignment.findMany({
            where: { id: { in: refIds }, class: { enrollments: { some: { studentId } } } },
            select: { id: true, title: true },
          }),
          db.class.findMany({
            where: { id: { in: refIds }, enrollments: { some: { studentId } } },
            select: { id: true, name: true },
          }),
        ]);

  const titles = new Map<string, string>();
  for (const klass of classes) titles.set(klass.id, klass.name);
  for (const assignment of assignments) titles.set(assignment.id, assignment.title);
  for (const submission of submissions) titles.set(submission.id, submission.assignment.title);

  const today = dayKey(now);
  return {
    streak: computeStreak(streakDates(rows), now),
    level: levelFor(totalXp(rows)),
    totalXp: totalXp(rows),
    recent: recentRows.map((row) => ({
      id: row.id,
      kind: row.kind,
      xp: row.xp,
      label: describeActivity(row.kind, row.refId ? (titles.get(row.refId) ?? null) : null),
      createdAt: row.createdAt.toISOString(),
    })),
    studyLoggedToday: rows.some((row) => row.kind === "STUDY_SESSION" && dayKey(row.createdAt) === today),
  };
}
