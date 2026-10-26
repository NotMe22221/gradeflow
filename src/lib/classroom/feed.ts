// The teacher's class Stream, built from rows the loader in ./stream.ts reads.
// Pure: no database access, safe to unit test.
//
// Four kinds of activity, newest first:
// - "posted":   an assignment or handwritten test was created
// - "returned": teacher-approved grades were published (one item per
//               assignment per day, so a batch of approvals reads as one post)
// - "scanned":  handwritten tests came in through the Paper Scanner (per
//               assignment per day)
// - "drafts":   AI first-pass drafts waiting in To review (one per assignment),
//               dated by the AI pass that produced them, so editing a draft
//               in To review never moves or re-times the post
//
// "Per day" means the viewer's calendar day (`timeZone`; undefined: the
// server's zone).

import { zonedDayNumber } from "@/lib/classroom/due";
import { parseAssignmentKind } from "@/lib/constants";

/** Most items the Stream shows. */
export const STREAM_LIMIT = 20;

type Base = { key: string; at: Date; assignmentId: string; title: string; isTest: boolean };

export type StreamItem =
  | (Base & { kind: "posted" })
  | (Base & { kind: "returned"; count: number })
  | (Base & { kind: "scanned"; studentNames: string[] })
  | (Base & { kind: "drafts"; count: number; demoCount: number });

export type StreamSource = {
  assignments: { id: string; title: string; kind: string; createdAt: Date }[];
  /** One row per PublishedGrade in the class. */
  published: { assignmentId: string; publishedAt: Date }[];
  /** One row per scanned (photo) submission in the class. */
  scans: { assignmentId: string; submittedAt: Date; studentName: string }[];
  /**
   * One row per submission in NEEDS_REVIEW. `readyAt` is when the AI pass that
   * produced the draft finished (AiGrade.createdAt), not the submission's
   * last edit; `grader` is the AiGrade's grader, if any.
   */
  drafts: { assignmentId: string; readyAt: Date; grader: string | null }[];
};

/** Group rows by assignment and calendar day, keeping the latest time per group. */
function groupByDay<T extends { assignmentId: string }>(rows: T[], at: (row: T) => Date, timeZone?: string) {
  const groups = new Map<string, { assignmentId: string; at: Date; rows: T[] }>();
  for (const row of rows) {
    const time = at(row);
    const key = `${row.assignmentId}:${zonedDayNumber(time, timeZone)}`;
    const group = groups.get(key);
    if (!group) groups.set(key, { assignmentId: row.assignmentId, at: time, rows: [row] });
    else {
      group.rows.push(row);
      if (time > group.at) group.at = time;
    }
  }
  return groups;
}

// For items at the same moment: what needs the teacher first.
const KIND_ORDER: Record<StreamItem["kind"], number> = { drafts: 0, scanned: 1, returned: 2, posted: 3 };

export function buildStream(source: StreamSource, limit = STREAM_LIMIT, timeZone?: string): StreamItem[] {
  const byId = new Map(
    source.assignments.map((a) => [a.id, { title: a.title, isTest: parseAssignmentKind(a.kind) === "TEST" }])
  );
  const items: StreamItem[] = [];

  for (const assignment of source.assignments) {
    const info = byId.get(assignment.id)!;
    items.push({ kind: "posted", key: `posted:${assignment.id}`, at: assignment.createdAt, assignmentId: assignment.id, ...info });
  }

  for (const [key, group] of groupByDay(source.published, (row) => row.publishedAt, timeZone)) {
    const info = byId.get(group.assignmentId);
    if (!info) continue;
    items.push({ kind: "returned", key: `returned:${key}`, at: group.at, assignmentId: group.assignmentId, ...info, count: group.rows.length });
  }

  for (const [key, group] of groupByDay(source.scans, (row) => row.submittedAt, timeZone)) {
    const info = byId.get(group.assignmentId);
    if (!info) continue;
    const studentNames = [...group.rows]
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
      .map((row) => row.studentName);
    items.push({ kind: "scanned", key: `scanned:${key}`, at: group.at, assignmentId: group.assignmentId, ...info, studentNames });
  }

  const drafts = new Map<string, { at: Date; count: number; demoCount: number }>();
  for (const row of source.drafts) {
    const entry = drafts.get(row.assignmentId) ?? { at: row.readyAt, count: 0, demoCount: 0 };
    entry.count++;
    if (row.grader === "demo") entry.demoCount++;
    if (row.readyAt > entry.at) entry.at = row.readyAt;
    drafts.set(row.assignmentId, entry);
  }
  for (const [assignmentId, entry] of drafts) {
    const info = byId.get(assignmentId);
    if (!info) continue;
    items.push({ kind: "drafts", key: `drafts:${assignmentId}`, assignmentId, ...info, ...entry });
  }

  return items
    .sort(
      (a, b) =>
        b.at.getTime() - a.at.getTime() || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.key.localeCompare(b.key)
    )
    .slice(0, Math.max(0, limit));
}
