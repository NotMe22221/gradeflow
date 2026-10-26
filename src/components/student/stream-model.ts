// A student's class Stream, built from their own work rows. Pure: no
// database access, safe to unit test.
//
// Three kinds of activity, newest first, and only this student's own:
// - "posted":    the teacher posted an assignment or paper test
// - "graded":    the teacher approved and returned this student's grade
// - "sent_back": the teacher sent this student's paper back for revision
//
// Nothing here ever comes from an AI draft: "graded" needs a published,
// teacher-approved grade.

import type { StudentWorkRow } from "@/components/student/todo-model";

export const STUDENT_STREAM_LIMIT = 20;

type Base = { key: string; at: Date; assignmentId: string; title: string; isTest: boolean };

export type StudentStreamItem =
  | (Base & { kind: "posted" })
  | (Base & { kind: "graded"; score: { total: number; max: number } | null })
  | (Base & { kind: "sent_back" });

function parse(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// For items at the same moment: the student's own news first.
const KIND_ORDER: Record<StudentStreamItem["kind"], number> = { graded: 0, sent_back: 1, posted: 2 };

export function buildStudentStream(rows: readonly StudentWorkRow[], limit = STUDENT_STREAM_LIMIT): StudentStreamItem[] {
  const items: StudentStreamItem[] = [];
  for (const row of rows) {
    const base = { assignmentId: row.id, title: row.title, isTest: row.kind === "TEST" };
    const posted = parse(row.postedAt);
    if (posted) items.push({ kind: "posted", key: `posted:${row.id}`, at: posted, ...base });

    const published = row.state === "graded" ? parse(row.publishedAt) : null;
    if (published) items.push({ kind: "graded", key: `graded:${row.id}`, at: published, score: row.score, ...base });

    // A send-back stays in the history after a resubmission or a grade.
    const returned = parse(row.returnedAt);
    if (returned) items.push({ kind: "sent_back", key: `sent_back:${row.id}`, at: returned, ...base });
  }
  return items
    .sort(
      (a, b) => b.at.getTime() - a.at.getTime() || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.key.localeCompare(b.key)
    )
    .slice(0, Math.max(0, limit));
}
