// How a submission's status reads from the student's side. Pure: safe for
// server and client components and unit tests.
//
// Students never see the AI pipeline. Every in-progress state (queued for the
// AI pass, grading, a failed AI pass, waiting in the review queue, mid-publish)
// collapses into one calm "Submitted" state.

import { isPastDueDay } from "@/lib/classroom/due";

export type StudentAssignmentState = "not_submitted" | "submitted" | "returned" | "graded";

export type StudentStateDisplay = {
  label: string;
  variant: "outline" | "secondary" | "warning" | "success";
  hint: string;
};

export const STUDENT_STATE_DISPLAY: Record<StudentAssignmentState, StudentStateDisplay> = {
  not_submitted: { label: "Not submitted", variant: "outline", hint: "Submit your paper" },
  submitted: { label: "Submitted", variant: "secondary", hint: "Waiting for your teacher" },
  returned: { label: "Revise and resubmit", variant: "warning", hint: "Your teacher left a note" },
  graded: { label: "Graded", variant: "success", hint: "Feedback is ready" },
};

/**
 * How a paper test reads. The student never submits one (they take it in
 * class and the teacher scans it), so "Not submitted", "Overdue", and
 * "Revise and resubmit" never apply to it.
 */
export const PAPER_TEST_DISPLAY = {
  /** Not scanned yet, and the test day hasn't passed. */
  upcoming: { label: "Paper test", variant: "outline", hint: "Taken in class" },
  /** The test day has passed and the teacher hasn't scanned it yet. */
  awaitingScan: { label: "Waiting for scan", variant: "secondary", hint: "Your teacher scans it" },
  /** Sent back by the teacher, who scans it again. */
  returned: { label: "Sent back", variant: "warning", hint: "Your teacher will rescan it" },
} as const satisfies Record<string, StudentStateDisplay>;

/** The badge wording for one assignment, with paper tests worded for what the student can actually do. */
export function studentStateDisplay(
  state: StudentAssignmentState,
  options: { paperTest?: boolean; awaitingScan?: boolean } = {}
): StudentStateDisplay {
  if (options.paperTest) {
    if (state === "not_submitted") return options.awaitingScan ? PAPER_TEST_DISPLAY.awaitingScan : PAPER_TEST_DISPLAY.upcoming;
    if (state === "returned") return PAPER_TEST_DISPLAY.returned;
  }
  return STUDENT_STATE_DISPLAY[state];
}

/**
 * A grade only counts as visible once a PublishedGrade exists. A submission
 * marked PUBLISHED without one (which publish.ts never produces) stays in the
 * "submitted" state rather than showing an empty grade.
 */
export function studentStateFor(
  status: string | null | undefined,
  hasPublishedGrade: boolean
): StudentAssignmentState {
  if (hasPublishedGrade) return "graded";
  if (!status) return "not_submitted";
  if (status === "RETURNED") return "returned";
  return "submitted";
}

/**
 * Due dates are calendar days (stored at noon UTC by the assignment builder),
 * so an assignment is only past due once the viewer's today is after its due
 * day: the shared isPastDueDay() rule, the same day boundary as "Due today".
 * `timeZone` is the viewer's (undefined: the server's zone).
 */
export function isPastDue(dueDate: Date | null | undefined, now: Date, timeZone?: string): boolean {
  return isPastDueDay(dueDate, now, timeZone);
}

/**
 * Work the student can still turn in, whose due day has ended. Never true
 * for a paper test: the student can't submit one, so it can't be overdue.
 */
export function isOverdue(
  kind: string,
  state: StudentAssignmentState,
  dueDate: Date | null | undefined,
  now: Date,
  timeZone?: string
): boolean {
  return (
    kind !== "TEST" && (state === "not_submitted" || state === "returned") && isPastDue(dueDate, now, timeZone)
  );
}

/**
 * A paper test whose test day (its due date) has ended and that the teacher
 * hasn't scanned yet. It is waiting on the teacher, not on the student.
 */
export function isAwaitingScan(
  kind: string,
  state: StudentAssignmentState,
  dueDate: Date | null | undefined,
  now: Date,
  timeZone?: string
): boolean {
  return kind === "TEST" && state === "not_submitted" && isPastDue(dueDate, now, timeZone);
}
