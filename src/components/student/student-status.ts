// How a submission's status reads from the student's side. Pure: safe for
// server and client components and unit tests.
//
// Students never see the AI pipeline. Every in-progress state (queued for the
// AI pass, grading, a failed AI pass, waiting in the review queue, mid-publish)
// collapses into one calm "Submitted" state.

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
 * so an assignment is only past due once its whole due day has ended.
 */
export function isPastDue(dueDate: Date | null | undefined, now: Date): boolean {
  if (!dueDate) return false;
  const endOfDueDay = Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth(),
    dueDate.getUTCDate(),
    23,
    59,
    59,
    999
  );
  return now.getTime() > endOfDueDay;
}
