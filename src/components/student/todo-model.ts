// Google Classroom's To-do vocabulary for the student's work: Assigned,
// Missing, and Done, grouped by due date. Pure: safe for server and client
// components and unit tests. Only teacher-approved scores ever appear here.
//
// The three tabs split the inbox model's tabs (inbox-model.ts) without
// changing them: "Assigned" + "Missing" is exactly the old "To do" tab, and
// "Done" is "Submitted" + "Graded". So the dashboard summary (inboxSummary)
// still names exactly what is waiting on the student.

import { daysUntil, dueLabel as relativeDueLabel } from "@/lib/classroom/due";
import { formatScore } from "@/lib/format";
import { tabFor, type InboxAssignment } from "@/components/student/inbox-model";

export type TodoTab = "assigned" | "missing" | "done";

export const TODO_TABS: { value: TodoTab; label: string }[] = [
  { value: "assigned", label: "Assigned" },
  { value: "missing", label: "Missing" },
  { value: "done", label: "Done" },
];

export function isTodoTab(value: unknown): value is TodoTab {
  return value === "assigned" || value === "missing" || value === "done";
}

/** One assignment from the student's side, with what the Stream and Classwork also need. */
export type StudentWorkRow = InboxAssignment & {
  /** When the teacher posted it (ISO). */
  postedAt: string;
  /** When the teacher sent the paper back for revision (ISO), if they did. */
  returnedAt: string | null;
};

type TabFields = Pick<InboxAssignment, "state" | "awaitingScan" | "pastDue">;

/**
 * Which To-do tab an assignment belongs to. Missing is work the student can
 * still turn in whose due day has ended; a paper test is never Missing (the
 * teacher scans it). A paper test taken in class and waiting for its scan is
 * Done: it is with the teacher, not the student.
 */
export function todoTabFor(row: TabFields): TodoTab {
  if (tabFor(row) !== "todo") return "done";
  return row.pastDue ? "missing" : "assigned";
}

export function todoCounts(rows: readonly TabFields[]): Record<TodoTab, number> {
  const counts: Record<TodoTab, number> = { assigned: 0, missing: 0, done: 0 };
  for (const row of rows) counts[todoTabFor(row)]++;
  return counts;
}

/** The first tab with something in it, in Classroom's order. */
export function defaultTodoTab(rows: readonly TabFields[]): TodoTab {
  const counts = todoCounts(rows);
  return TODO_TABS.find((tab) => counts[tab.value] > 0)?.value ?? "assigned";
}

// --- Status wording ------------------------------------------------------------

export type WorkTone = "assigned" | "missing" | "done" | "returned" | "attention" | "neutral";

export type WorkStatus = {
  /** Short status, e.g. "Assigned", "Missing", "Turned in", "Returned". */
  label: string;
  tone: WorkTone;
};

/** Text colors for each tone. Status colors are used for status only. */
export const WORK_TONE_CLASS: Record<WorkTone, string> = {
  assigned: "text-success",
  missing: "text-danger",
  done: "text-muted-foreground",
  returned: "text-foreground",
  attention: "text-warning-soft-foreground",
  neutral: "text-muted-foreground",
};

/**
 * Classroom's status for one assignment. Paper tests never read as Assigned
 * or Missing: the student takes them in class and the teacher scans them.
 */
export function workStatus(row: Pick<InboxAssignment, "state" | "kind" | "pastDue" | "awaitingScan">): WorkStatus {
  switch (row.state) {
    case "graded":
      return { label: "Returned", tone: "returned" };
    case "submitted":
      return { label: "Turned in", tone: "done" };
    case "returned":
      return { label: "Sent back", tone: "attention" };
    case "not_submitted":
      if (row.kind === "TEST") {
        return row.awaitingScan
          ? { label: "Waiting for scan", tone: "neutral" }
          : { label: "Paper test", tone: "neutral" };
      }
      return row.pastDue ? { label: "Missing", tone: "missing" } : { label: "Assigned", tone: "assigned" };
  }
}

/** The one-line note under a paper test that hasn't been scanned yet. */
export const PAPER_TEST_NOTE = "Your teacher scans this test";

/** "18/25" once a grade is returned, else null. */
export function scoreText(row: Pick<InboxAssignment, "state" | "score">): string | null {
  return row.state === "graded" && row.score ? formatScore(row.score.total, row.score.max) : null;
}

// --- Due dates -----------------------------------------------------------------

function parse(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Relative due label in Classroom's style: "Due tomorrow", "Due Wednesday",
 * "Due Nov 9", or "No due date". A paper test has a test day instead:
 * "Test tomorrow", "Test on Friday", "Test day Nov 9", "No test date".
 */
export function relativeDue(row: Pick<InboxAssignment, "dueDate" | "kind">, now: Date): string {
  const due = parse(row.dueDate);
  const test = row.kind === "TEST";
  if (!due) return test ? "No test date" : "No due date";
  const label = relativeDueLabel(due, now);
  if (!test) return label;
  // "Test today", "Test tomorrow", "Test on Wednesday", else "Test day Nov 9".
  const days = daysUntil(due, now);
  if (days === 0 || days === 1) return label.replace(/^Due/, "Test");
  if (days > 1 && days < 7) return label.replace(/^Due/, "Test on");
  return label.replace(/^Due/, "Test day");
}

// --- Groups ----------------------------------------------------------------------

export type TodoGroupKey = "no_due" | "done_early" | "earlier" | "last_week" | "this_week" | "next_week" | "later";

export const TODO_GROUP_LABELS: Record<TodoGroupKey, string> = {
  no_due: "No due date",
  done_early: "Done early",
  earlier: "Earlier",
  last_week: "Last week",
  this_week: "This week",
  next_week: "Next week",
  later: "Later",
};

/** The groups each tab shows, in order. */
export const TODO_GROUP_ORDER: Record<TodoTab, TodoGroupKey[]> = {
  assigned: ["no_due", "earlier", "this_week", "next_week", "later"],
  missing: ["this_week", "last_week", "earlier"],
  done: ["no_due", "done_early", "this_week", "last_week", "earlier"],
};

/**
 * The due-date group for a row in its tab. Weeks run Sunday to Saturday in
 * local calendar days, as Classroom shows them in the US.
 */
export function todoGroupFor(row: Pick<InboxAssignment, "dueDate">, tab: TodoTab, now: Date): TodoGroupKey {
  const due = parse(row.dueDate);
  if (!due) return tab === "missing" ? "earlier" : "no_due";
  const days = daysUntil(due, now);
  const startOfWeek = -now.getDay(); // days from today back to Sunday
  const endOfWeek = startOfWeek + 6;

  if (tab === "done" && days > 0) return "done_early";
  if (days > endOfWeek) return days > endOfWeek + 7 ? "later" : "next_week";
  if (days >= startOfWeek) return "this_week";
  if (tab === "assigned") return "earlier";
  return days >= startOfWeek - 7 ? "last_week" : "earlier";
}

function time(value: string | null): number | null {
  return parse(value)?.getTime() ?? null;
}

/**
 * Sort key inside a group. Assigned: soonest due first (papers sent back
 * first). Missing: most recently due first. Done: most recent first.
 */
export function todoSortKey(row: StudentWorkRow | InboxAssignment, tab: TodoTab): number {
  const due = time(row.dueDate);
  if (tab === "assigned") return (row.state === "returned" ? -1e15 : 0) + (due ?? Number.MAX_SAFE_INTEGER / 2);
  if (tab === "missing") return -(due ?? 0);
  return -(due ?? time(row.publishedAt) ?? time(row.submittedAt) ?? 0);
}

/** A row on the To-do page, with everything precomputed on the server so the client renders the same labels. */
export type TodoItem = {
  id: string;
  title: string;
  classId: string;
  className: string;
  isTest: boolean;
  tab: TodoTab;
  group: TodoGroupKey;
  sortKey: number;
  /** "Due tomorrow", "Test Nov 9", "No due date". */
  dueText: string;
  status: WorkStatus;
  /** "18/25" once returned. */
  score: string | null;
  /** A short extra line, e.g. "Your teacher scans this test". */
  note: string | null;
};

export function toTodoItem(row: InboxAssignment, now: Date): TodoItem {
  const tab = todoTabFor(row);
  const isTest = row.kind === "TEST";
  return {
    id: row.id,
    title: row.title,
    classId: row.classId,
    className: row.className,
    isTest,
    tab,
    group: todoGroupFor(row, tab, now),
    sortKey: todoSortKey(row, tab),
    dueText: relativeDue(row, now),
    status: workStatus(row),
    score: scoreText(row),
    note: isTest && row.state === "not_submitted" ? PAPER_TEST_NOTE : null,
  };
}

export type TodoGroup = { key: TodoGroupKey; label: string; items: TodoItem[] };

/** Items for one tab, grouped and sorted. Empty groups are left out. */
export function groupTodoItems(items: readonly TodoItem[], tab: TodoTab): TodoGroup[] {
  const inTab = items.filter((item) => item.tab === tab);
  return TODO_GROUP_ORDER[tab]
    .map((key) => ({
      key,
      label: TODO_GROUP_LABELS[key],
      items: inTab
        .filter((item) => item.group === key)
        .sort((a, b) => a.sortKey - b.sortKey || a.title.localeCompare(b.title)),
    }))
    .filter((group) => group.items.length > 0);
}

/** Work due soon that the student still has to do (Assigned only), soonest first. */
export function dueSoon<T extends InboxAssignment>(rows: readonly T[], now: Date, limit: number, days = 14): T[] {
  return rows
    .filter((row) => todoTabFor(row) === "assigned")
    .map((row) => ({ row, due: parse(row.dueDate) }))
    .filter((entry): entry is { row: T; due: Date } => {
      if (!entry.due) return false;
      const until = daysUntil(entry.due, now);
      return until >= 0 && until <= days;
    })
    .sort((a, b) => a.due.getTime() - b.due.getTime() || a.row.title.localeCompare(b.row.title))
    .slice(0, limit)
    .map((entry) => entry.row);
}
