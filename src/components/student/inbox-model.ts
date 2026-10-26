// Assignment inbox model for the student dashboard. Pure: safe for server and
// client components and unit tests. Only published scores ever appear here.

import type { AssignmentKind } from "@/lib/constants";
import { formatDate, formatDueDate, formatPercent, formatScore, pluralize } from "@/lib/format";
import type { StudentAssignmentState } from "@/components/student/student-status";
import type { DueWhen } from "@/components/student/todo-model";

/**
 * The inbox's original three buckets. The UI now shows Classroom's To-do
 * tabs (Assigned / Missing / Done, see todo-model.ts), which split "todo"
 * into Assigned and Missing; these stay as the source of truth for what is
 * waiting on the student.
 */
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
  /** Not turned in (or sent back), the due day has ended, and the student can still submit it. Never a paper test. */
  pastDue: boolean;
  /** A paper test whose test day has ended and that the teacher hasn't scanned yet: waiting on the teacher. */
  awaitingScan: boolean;
  state: StudentAssignmentState;
  /** Only present once a grade is published. */
  score: { total: number; max: number } | null;
  totalPoints: number;
  /** Rubric criteria (titles and points only; descriptions can hold a test's answer key). */
  criteria: InboxCriterion[];
};

/**
 * An inbox row as the Home sends it, with its due label precomputed on the
 * server. Computing it in the browser could disagree with the server render
 * (another time zone, or just past midnight) and cause a hydration mismatch.
 */
export type InboxRow = InboxAssignment & {
  /** Classroom's relative due label (todo-model's relativeDue): "Due tomorrow", "Test on Friday", "Due Nov 9". */
  dueText: string;
  /**
   * The due date said two ways (todo-model's dueWhen): "Due in 9 days" and
   * "Mon, Nov 9". Optional so older callers still type-check; the inbox falls
   * back to dueText without it.
   */
  due?: DueWhen;
};

/**
 * Which tab a row belongs to. A paper test the teacher hasn't scanned yet
 * sits with "Submitted" once its test day has passed: the student handed it
 * in on paper, and it's waiting on the teacher, not on them.
 */
export function tabFor(row: Pick<InboxAssignment, "state" | "awaitingScan">): InboxTab {
  if (row.state === "graded") return "graded";
  if (row.state === "submitted" || row.awaitingScan) return "submitted";
  return "todo";
}

export function inboxCounts(rows: readonly InboxAssignment[]): Record<InboxTab, number> {
  const counts: Record<InboxTab, number> = { todo: 0, submitted: 0, graded: 0 };
  for (const row of rows) counts[tabFor(row)]++;
  return counts;
}

function time(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Rows for one tab, most useful first. To do: papers sent back, then by due
 * date (overdue first, no due date last). Submitted: newest submission (or
 * test day, for a paper test waiting for its scan) first. Graded: newest
 * grade first.
 */
export function rowsForTab(rows: readonly InboxAssignment[], tab: InboxTab): InboxAssignment[] {
  const inTab = rows.filter((row) => tabFor(row) === tab);
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
    const handedIn = (row: InboxAssignment) => time(row.submittedAt ?? (row.awaitingScan ? row.dueDate : null), 0);
    return inTab.sort((a, b) => handedIn(b) - handedIn(a) || byTitle(a, b));
  }
  return inTab.sort((a, b) => time(b.publishedAt, 0) - time(a.publishedAt, 0) || byTitle(a, b));
}

/** The first tab with something in it, so the inbox never opens on an empty list it doesn't need to. */
export function defaultInboxTab(rows: readonly InboxAssignment[]): InboxTab {
  const counts = inboxCounts(rows);
  return INBOX_TABS.find((tab) => counts[tab.value] > 0)?.value ?? "todo";
}

/**
 * "Due Oct 24". A paper test has a test day instead: "Test day Oct 24".
 * The inbox shows InboxRow.dueText (relative, like Classwork and To-do) instead.
 */
export function dueLabel(row: Pick<InboxAssignment, "dueDate" | "kind">): string {
  if (row.kind === "TEST") return row.dueDate ? `Test day ${formatDueDate(row.dueDate)}` : "No test date";
  return row.dueDate ? `Due ${formatDueDate(row.dueDate)}` : "No due date";
}

/** One plain sentence about where this assignment stands. */
export function statusSummary(row: InboxAssignment): string {
  switch (row.state) {
    case "graded":
      return row.score
        ? `Returned with ${formatScore(row.score.total, row.score.max)} (${formatPercent(row.score.total, row.score.max)}). Your teacher's feedback is ready.`
        : "Returned. Your teacher's feedback is ready.";
    case "submitted":
      // A paper test reaches "submitted" when the teacher scans (or types in) the student's paper.
      if (row.kind === "TEST") {
        return row.submittedAt
          ? `Your teacher added your test on ${formatDate(row.submittedAt)} and is reviewing it.`
          : "Your teacher added your test and is reviewing it.";
      }
      return row.submittedAt
        ? `Turned in ${formatDate(row.submittedAt)}. Your teacher is reviewing it.`
        : "Turned in. Your teacher is reviewing it.";
    case "returned":
      if (row.kind === "TEST") return "Your teacher sent this back with a note and will rescan it.";
      return "Your teacher sent this back with a note. Revise it and resubmit.";
    case "not_submitted":
      if (row.kind === "TEST") {
        return row.awaitingScan
          ? `The test was on ${formatDueDate(row.dueDate)}. Your teacher scans the papers, and your grade appears here once it's approved.`
          : "A paper test. You take it in class and your teacher scans it, so there's nothing to upload.";
      }
      if (row.pastDue) return `Missing since ${formatDueDate(row.dueDate)}. Turn it in as soon as you can.`;
      return row.dueDate ? `Assigned. Due ${formatDueDate(row.dueDate)}.` : "Assigned. No due date.";
  }
}

/** "a", "a and b", "a, b, and c". */
function joinList(parts: string[]): string {
  if (parts.length <= 2) return parts.join(" and ");
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

/**
 * The dashboard's one-line summary. It names everything in the To do tab,
 * so the summary and the tab count always agree. Paper tests are counted on
 * their own: the student never submits or revises one.
 */
export function inboxSummary(rows: readonly InboxAssignment[]): string {
  const count = (keep: (row: InboxAssignment) => boolean) => rows.filter(keep).length;
  const isTest = (row: InboxAssignment) => row.kind === "TEST";
  const toSubmit = count((row) => row.state === "not_submitted" && !isTest(row));
  const toRevise = count((row) => row.state === "returned" && !isTest(row));
  const testsSentBack = count((row) => row.state === "returned" && isTest(row));
  const upcomingTests = count((row) => row.state === "not_submitted" && isTest(row) && !row.awaitingScan);
  // Papers with the teacher, including paper tests taken in class and not scanned yet.
  const waiting = count((row) => tabFor(row) === "submitted");

  const todo = [
    toSubmit > 0 ? `${pluralize(toSubmit, "assignment")} to submit` : null,
    toRevise > 0 ? `${pluralize(toRevise, "paper")} to revise` : null,
    testsSentBack > 0 ? `${pluralize(testsSentBack, "test")} your teacher sent back` : null,
    upcomingTests > 0 ? `${pluralize(upcomingTests, "paper test")} coming up` : null,
  ].filter((part): part is string => part !== null);

  if (todo.length > 0) return `You have ${joinList(todo)}.`;
  if (waiting > 0) return "You're all caught up. Grades appear here once your teacher approves them.";
  return "You're all caught up.";
}
