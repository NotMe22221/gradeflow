// Assignment inbox model for the student dashboard. Pure: safe for server and
// client components and unit tests. Only published scores ever appear here.

import type { AssignmentKind } from "@/lib/constants";
import { formatDate, formatPercent, formatScore } from "@/lib/format";
import type { StudentAssignmentState } from "@/components/student/student-status";

export type InboxTab = "todo" | "submitted" | "graded";

export const INBOX_TABS: { value: InboxTab; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "submitted", label: "Submitted" },
  { value: "graded", label: "Graded" },
];

export type InboxCriterion = { id: string; title: string; maxPoints: number };

export type InboxAssignment = {
  id: string;
  title: string;
  classId: string;
  className: string;
  kind: AssignmentKind;
  /** ISO timestamps (serializable for client components). */
  dueDate: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
  /** Not turned in (or sent back) and the due day has ended. */
  pastDue: boolean;
  state: StudentAssignmentState;
  /** Only present once a grade is published. */
  score: { total: number; max: number } | null;
  totalPoints: number;
  /** Rubric criteria (titles and points only; descriptions can hold a test's answer key). */
  criteria: InboxCriterion[];
};

export function tabFor(state: StudentAssignmentState): InboxTab {
  if (state === "graded") return "graded";
  if (state === "submitted") return "submitted";
  return "todo";
}

export function inboxCounts(rows: readonly InboxAssignment[]): Record<InboxTab, number> {
  const counts: Record<InboxTab, number> = { todo: 0, submitted: 0, graded: 0 };
  for (const row of rows) counts[tabFor(row.state)]++;
  return counts;
}

function time(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Rows for one tab, most useful first. To do: papers sent back, then by due
 * date (overdue first, no due date last). Submitted: newest submission first.
 * Graded: newest grade first.
 */
export function rowsForTab(rows: readonly InboxAssignment[], tab: InboxTab): InboxAssignment[] {
  const inTab = rows.filter((row) => tabFor(row.state) === tab);
  const byTitle = (a: InboxAssignment, b: InboxAssignment) => a.title.localeCompare(b.title);
  if (tab === "todo") {
    return inTab.sort(
      (a, b) =>
        Number(b.state === "returned") - Number(a.state === "returned") ||
        time(a.dueDate, Number.MAX_SAFE_INTEGER) - time(b.dueDate, Number.MAX_SAFE_INTEGER) ||
        byTitle(a, b)
    );
  }
  if (tab === "submitted") {
    return inTab.sort((a, b) => time(b.submittedAt, 0) - time(a.submittedAt, 0) || byTitle(a, b));
  }
  return inTab.sort((a, b) => time(b.publishedAt, 0) - time(a.publishedAt, 0) || byTitle(a, b));
}

/** The first tab with something in it, so the inbox never opens on an empty list it doesn't need to. */
export function defaultInboxTab(rows: readonly InboxAssignment[]): InboxTab {
  const counts = inboxCounts(rows);
  return INBOX_TABS.find((tab) => counts[tab.value] > 0)?.value ?? "todo";
}

export function dueLabel(row: Pick<InboxAssignment, "dueDate">): string {
  return row.dueDate ? `Due ${formatDate(row.dueDate)}` : "No due date";
}

/** One plain sentence about where this assignment stands. */
export function statusSummary(row: InboxAssignment): string {
  switch (row.state) {
    case "graded":
      return row.score
        ? `Graded ${formatScore(row.score.total, row.score.max)} (${formatPercent(row.score.total, row.score.max)}). Your teacher's feedback is ready.`
        : "Graded. Your teacher's feedback is ready.";
    case "submitted":
      return row.submittedAt
        ? `Submitted ${formatDate(row.submittedAt)}. Your teacher is reviewing it.`
        : "Submitted. Your teacher is reviewing it.";
    case "returned":
      return "Your teacher sent this back with a note. Revise it and resubmit.";
    case "not_submitted":
      if (row.kind === "TEST") return "A paper test. Your teacher scans it after class, so there's nothing to upload.";
      if (row.pastDue) return `Overdue since ${formatDate(row.dueDate)}. Submit it as soon as you can.`;
      return row.dueDate ? `Not submitted yet. Due ${formatDate(row.dueDate)}.` : "Not submitted yet.";
  }
}
