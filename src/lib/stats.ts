import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  ILLUSTRATIVE_MINUTES_SAVED_PER_PAPER,
  READY_FOR_AI_STATUSES,
  STALE_GRADING_CLAIM_MS,
} from "@/lib/constants";
import { db } from "@/lib/db";

/*
 * Teacher dashboard numbers. "Graded" figures and scores come only from
 * PublishedGrade (teacher-approved). Workflow counts (pending review, ready
 * for AI) come from Submission.status, using the shared groupings in
 * constants.ts (READY_FOR_AI_STATUSES: never run, or a failed run to retry;
 * plus GRADING claims abandoned mid-grade, as isStaleGradingClaim defines).
 * Every query is scoped to the teacher's own classes.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export type DashboardStats = {
  /** Grades published in the last 7 days. */
  gradedThisWeek: number;
  /** Mean |AI total - approved total| in points; null with no comparable grades. */
  avgAiFinalDiff: number | null;
  /** How many approved grades the difference is averaged over. */
  avgAiFinalDiffSample: number;
  /** Illustrative only: gradedThisWeek x ILLUSTRATIVE_MINUTES_SAVED_PER_PAPER. */
  timeSavedMinutes: number;
  pendingReview: number;
  readyForAi: number;
};

export type ClassSummary = {
  id: string;
  name: string;
  section: string | null;
  subject: string | null;
  studentCount: number;
  assignmentCount: number;
  pendingReview: number;
  readyForAi: number;
  publishedCount: number;
  /** Assignments with papers in the review queue, for deep links. */
  pendingAssignmentIds: string[];
  nextDue?: { title: string; dueDate: Date };
};

export type ReadyForAiAssignment = {
  id: string;
  title: string;
  className: string;
  count: number;
};

export type RecentlyPublished = {
  submissionId: string;
  studentName: string;
  assignmentTitle: string;
  assignmentId: string;
  totalScore: number;
  maxScore: number;
  publishedAt: Date;
};

function ownedBy(teacherId: string) {
  return { assignment: { class: { teacherId } } };
}

/**
 * Papers waiting on an AI first pass: READY_FOR_AI_STATUSES plus stale GRADING
 * claims (the database form of isStaleGradingClaim), so these counts agree with
 * the assignment page and gradebook, which offer a retry for them.
 */
function readyForAiConditions(now: Date): Prisma.SubmissionWhereInput[] {
  return [
    { status: { in: READY_FOR_AI_STATUSES } },
    { status: "GRADING", updatedAt: { lt: new Date(now.getTime() - STALE_GRADING_CLAIM_MS) } },
  ];
}

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function getDashboardStats(teacherId: string, now: Date = new Date()): Promise<DashboardStats> {
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

  const [gradedThisWeek, comparisons, pendingReview, readyForAi] = await Promise.all([
    db.publishedGrade.count({
      where: { publishedAt: { gte: weekAgo, lte: now }, submission: ownedBy(teacherId) },
    }),
    db.publishedGrade.findMany({
      where: { aiTotalScore: { not: null }, submission: ownedBy(teacherId) },
      select: { aiTotalScore: true, totalScore: true },
    }),
    db.submission.count({ where: { status: "NEEDS_REVIEW", ...ownedBy(teacherId) } }),
    db.submission.count({ where: { OR: readyForAiConditions(now), ...ownedBy(teacherId) } }),
  ]);

  const diffs = comparisons
    .map((grade) => (grade.aiTotalScore === null ? null : Math.abs(grade.aiTotalScore - grade.totalScore)))
    .filter((diff): diff is number => diff !== null && Number.isFinite(diff));

  const avgAiFinalDiff =
    diffs.length > 0
      ? Math.round((diffs.reduce((sum, diff) => sum + diff, 0) / diffs.length) * 100) / 100
      : null;

  return {
    gradedThisWeek,
    avgAiFinalDiff,
    avgAiFinalDiffSample: diffs.length,
    timeSavedMinutes: gradedThisWeek * ILLUSTRATIVE_MINUTES_SAVED_PER_PAPER,
    pendingReview,
    readyForAi,
  };
}

export async function getClassSummaries(teacherId: string, now: Date = new Date()): Promise<ClassSummary[]> {
  const [classes, statusCounts, publishedRows] = await Promise.all([
    db.class.findMany({
      where: { teacherId },
      orderBy: [{ createdAt: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        section: true,
        subject: true,
        _count: { select: { enrollments: true } },
        assignments: { select: { id: true, title: true, dueDate: true } },
      },
    }),
    db.submission.groupBy({
      by: ["assignmentId", "status"],
      where: {
        OR: [{ status: "NEEDS_REVIEW" }, ...readyForAiConditions(now)],
        ...ownedBy(teacherId),
      },
      _count: { _all: true },
    }),
    db.publishedGrade.findMany({
      where: { submission: ownedBy(teacherId) },
      select: { submission: { select: { assignmentId: true } } },
    }),
  ]);

  const pendingByAssignment = new Map<string, number>();
  const readyByAssignment = new Map<string, number>();
  // Every other status here is ready for AI, including GRADING: the where
  // clause only lets stale (abandoned) GRADING claims through.
  for (const row of statusCounts) {
    const target = row.status === "NEEDS_REVIEW" ? pendingByAssignment : readyByAssignment;
    target.set(row.assignmentId, (target.get(row.assignmentId) ?? 0) + row._count._all);
  }

  const publishedByAssignment = new Map<string, number>();
  for (const row of publishedRows) {
    const id = row.submission.assignmentId;
    publishedByAssignment.set(id, (publishedByAssignment.get(id) ?? 0) + 1);
  }

  const today = startOfDay(now);

  return classes.map((klass) => {
    let pendingReview = 0;
    let readyForAi = 0;
    let publishedCount = 0;
    const pendingAssignmentIds: string[] = [];
    let nextDue: ClassSummary["nextDue"];

    for (const assignment of klass.assignments) {
      const pending = pendingByAssignment.get(assignment.id) ?? 0;
      pendingReview += pending;
      if (pending > 0) pendingAssignmentIds.push(assignment.id);
      readyForAi += readyByAssignment.get(assignment.id) ?? 0;
      publishedCount += publishedByAssignment.get(assignment.id) ?? 0;

      const due = assignment.dueDate;
      if (due && due >= today && (!nextDue || due < nextDue.dueDate)) {
        nextDue = { title: assignment.title, dueDate: due };
      }
    }

    return {
      id: klass.id,
      name: klass.name,
      section: klass.section,
      subject: klass.subject,
      studentCount: klass._count.enrollments,
      assignmentCount: klass.assignments.length,
      pendingReview,
      readyForAi,
      publishedCount,
      pendingAssignmentIds,
      ...(nextDue ? { nextDue } : {}),
    };
  });
}

/** Assignments with papers waiting on an AI first pass, most papers first. */
export async function getReadyForAiAssignments(
  teacherId: string,
  now: Date = new Date()
): Promise<ReadyForAiAssignment[]> {
  const counts = await db.submission.groupBy({
    by: ["assignmentId"],
    where: { OR: readyForAiConditions(now), ...ownedBy(teacherId) },
    _count: { _all: true },
  });
  if (counts.length === 0) return [];

  const assignments = await db.assignment.findMany({
    where: { id: { in: counts.map((row) => row.assignmentId) }, class: { teacherId } },
    select: { id: true, title: true, class: { select: { name: true } } },
  });
  const countById = new Map(counts.map((row) => [row.assignmentId, row._count._all]));

  return assignments
    .map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      className: assignment.class.name,
      count: countById.get(assignment.id) ?? 0,
    }))
    .filter((assignment) => assignment.count > 0)
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
}

export async function getRecentlyPublished(teacherId: string, limit = 5): Promise<RecentlyPublished[]> {
  const take = Math.min(Math.max(Math.trunc(limit) || 5, 1), 50);
  const grades = await db.publishedGrade.findMany({
    where: { submission: ownedBy(teacherId) },
    orderBy: { publishedAt: "desc" },
    take,
    select: {
      totalScore: true,
      maxScore: true,
      publishedAt: true,
      submission: {
        select: {
          id: true,
          student: { select: { name: true } },
          assignment: { select: { id: true, title: true } },
        },
      },
    },
  });

  return grades.map((grade) => ({
    submissionId: grade.submission.id,
    studentName: grade.submission.student.name,
    assignmentTitle: grade.submission.assignment.title,
    assignmentId: grade.submission.assignment.id,
    totalScore: grade.totalScore,
    maxScore: grade.maxScore,
    publishedAt: grade.publishedAt,
  }));
}
