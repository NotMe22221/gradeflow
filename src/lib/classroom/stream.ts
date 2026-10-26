import "server-only";

import { buildStream, STREAM_LIMIT, type StreamItem } from "@/lib/classroom/feed";
import { upcomingWork } from "@/lib/classroom/due";
import { parseAssignmentKind } from "@/lib/constants";
import { db } from "@/lib/db";

/*
 * Data for the teacher's class Stream and Home class cards. Every query is
 * scoped to the teacher's own classes (class.teacherId), on top of the page's
 * getOwnedClass() check, so a class id from the URL can never reach another
 * teacher's activity.
 */

// Bounds on the rows read for the feed; the feed itself shows STREAM_LIMIT items.
const MAX_PUBLISHED_ROWS = 500;
const MAX_SCAN_ROWS = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

export type { StreamItem };

export type StreamAssignment = {
  id: string;
  title: string;
  isTest: boolean;
  dueDate: Date | null;
  createdAt: Date;
};

export type ClassStream = {
  items: StreamItem[];
  /** All assignments in the class, newest first. */
  assignments: StreamAssignment[];
  studentCount: number;
};

/**
 * The class Stream: activity feed, assignments (for Upcoming), and roster
 * size. `timeZone` is the viewer's, for grouping activity by day.
 */
export async function getClassStream(
  teacherId: string,
  classId: string,
  { limit = STREAM_LIMIT, timeZone }: { limit?: number; timeZone?: string } = {}
): Promise<ClassStream> {
  const inClass = { assignment: { classId, class: { teacherId } } };

  const [assignments, published, scans, drafts, studentCount] = await Promise.all([
    db.assignment.findMany({
      where: { classId, class: { teacherId } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, kind: true, dueDate: true, createdAt: true },
    }),
    db.publishedGrade.findMany({
      where: { submission: inClass },
      orderBy: { publishedAt: "desc" },
      take: MAX_PUBLISHED_ROWS,
      select: { publishedAt: true, submission: { select: { assignmentId: true } } },
    }),
    db.submission.findMany({
      where: { source: "SCAN", ...inClass },
      orderBy: { submittedAt: "desc" },
      take: MAX_SCAN_ROWS,
      select: { assignmentId: true, submittedAt: true, student: { select: { name: true } } },
    }),
    db.submission.findMany({
      where: { status: "NEEDS_REVIEW", ...inClass },
      select: { assignmentId: true, updatedAt: true, aiGrade: { select: { grader: true, createdAt: true } } },
    }),
    db.enrollment.count({ where: { classId, class: { teacherId } } }),
  ]);

  const items = buildStream(
    {
      assignments,
      published: published.map((row) => ({ assignmentId: row.submission.assignmentId, publishedAt: row.publishedAt })),
      scans: scans.map((row) => ({ assignmentId: row.assignmentId, submittedAt: row.submittedAt, studentName: row.student.name })),
      // Dated by the latest AI pass (both AI write paths reset AiGrade.createdAt
      // on a re-run). Submission.updatedAt moves on every draft autosave, so it
      // is only a fallback for a NEEDS_REVIEW paper without an AiGrade row.
      drafts: drafts.map((row) => ({
        assignmentId: row.assignmentId,
        readyAt: row.aiGrade?.createdAt ?? row.updatedAt,
        grader: row.aiGrade?.grader ?? null,
      })),
    },
    limit,
    timeZone
  );

  return {
    items,
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      isTest: parseAssignmentKind(a.kind) === "TEST",
      dueDate: a.dueDate,
      createdAt: a.createdAt,
    })),
    studentCount,
  };
}

export type UpcomingAssignment = { id: string; title: string; dueDate: Date };

/**
 * Up to `perClass` assignments due soon in each of the teacher's classes, by
 * class id. "Today" is the viewer's day in `timeZone` (undefined: the server's).
 */
export async function getUpcomingByClass(
  teacherId: string,
  now: Date = new Date(),
  perClass = 2,
  timeZone?: string
): Promise<Map<string, UpcomingAssignment[]>> {
  const rows = await db.assignment.findMany({
    // Slack either side of "today" (any zone is within a day of UTC):
    // upcomingWork() does the exact calendar-day check in the viewer's zone.
    where: { class: { teacherId }, dueDate: { gte: new Date(now.getTime() - 2 * DAY_MS) } },
    orderBy: [{ dueDate: "asc" }, { title: "asc" }],
    select: { id: true, title: true, dueDate: true, classId: true },
  });

  const byClass = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byClass.get(row.classId) ?? [];
    list.push(row);
    byClass.set(row.classId, list);
  }

  const result = new Map<string, UpcomingAssignment[]>();
  for (const [classId, list] of byClass) {
    const upcoming = upcomingWork(list, now, { limit: perClass, timeZone }).map(({ id, title, dueDate }) => ({ id, title, dueDate }));
    if (upcoming.length > 0) result.set(classId, upcoming);
  }
  return result;
}
