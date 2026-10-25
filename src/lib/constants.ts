// String "enums" for SQLite. Keep in sync with prisma/schema.prisma comments.

export const ROLES = ["TEACHER", "STUDENT"] as const;
export type Role = (typeof ROLES)[number];

export const SUBMISSION_STATUSES = [
  "SUBMITTED", // received, AI first pass not run yet
  "GRADING", // AI first pass in progress
  "GRADING_FAILED", // AI first pass errored; teacher can retry
  "NEEDS_REVIEW", // AI suggestion ready, waiting in the teacher's review queue
  "APPROVED", // teacher approved; transient state inside the publish transaction
  "RETURNED", // teacher sent it back to the student with a note
  "PUBLISHED", // grade published to the gradebook and student view
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** Papers waiting for an AI first pass (what the batch "Run AI first pass" grades). */
export const READY_FOR_AI_STATUSES: SubmissionStatus[] = ["SUBMITTED", "GRADING_FAILED"];

/**
 * A GRADING claim older than this was abandoned by a request that died
 * mid-grade (e.g. a server restart): the server lets a new run take it over
 * and the assignment page offers "Retry AI pass". Longer than the Claude
 * grader's worst case (120s timeout x 3 attempts).
 */
export const STALE_GRADING_CLAIM_MS = 7 * 60 * 1000;

/**
 * A GRADING claim abandoned mid-grade (see STALE_GRADING_CLAIM_MS). The
 * assignment page, gradebook, and dashboard counts all treat it as ready for
 * an AI pass, so no surface shows "Grading" for a run that will never finish.
 */
export function isStaleGradingClaim(status: string, updatedAt: Date, now: number = Date.now()): boolean {
  return status === "GRADING" && now - updatedAt.getTime() > STALE_GRADING_CLAIM_MS;
}

/** Papers the server lets the AI pass (re-)run on. Re-running NEEDS_REVIEW replaces the suggestion. */
export const AI_RERUNNABLE_STATUSES: SubmissionStatus[] = [...READY_FOR_AI_STATUSES, "NEEDS_REVIEW"];

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const GRADERS = ["claude", "demo"] as const;
export type GraderKind = (typeof GRADERS)[number];

/** UI label per grader. Add an entry here when adding a grader to GRADERS. */
export const GRADER_LABELS: Record<GraderKind, string> = {
  claude: "Claude",
  demo: "Demo grader",
};

/**
 * Tooltip text per grader (grader badge and top-bar status). Add an entry
 * here when adding a grader to GRADERS.
 */
export const GRADER_DESCRIPTIONS: Record<GraderKind, (model: string | null) => string> = {
  claude: (model) =>
    `First pass by the Claude API${model ? ` (${model})` : ""}. A suggestion only: nothing publishes until you approve it.`,
  demo: () =>
    "Local, deterministic heuristic used when no ANTHROPIC_API_KEY is set. Its scores and quotes are placeholders, not real AI output.",
};

/** Coerce a stored AiGrade.grader value. Unknown values are treated as the demo grader. */
export function parseGraderKind(value: string | null | undefined): GraderKind {
  return (GRADERS as readonly string[]).includes(value ?? "") ? (value as GraderKind) : "demo";
}

export const DEMO_TEACHER_EMAIL = "morgan.hale@gradeflow.example";

/** Illustrative assumption for the time-saved estimate. Not a measurement. */
export const ILLUSTRATIVE_MINUTES_SAVED_PER_PAPER = 6;

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function isConfidence(value: string): value is Confidence {
  return (CONFIDENCE_LEVELS as readonly string[]).includes(value);
}

/** The student the "View as a student" landing link signs in as. */
export const DEMO_STUDENT_EMAIL = "ava.quillon@students.gradeflow.example";

/**
 * One-click demo sign-in (landing page buttons and the account switcher).
 * On by default for the hackathon demo; set GRADEFLOW_DEMO_LOGIN=off to hide it.
 */
export function demoLoginEnabled(): boolean {
  return process.env.GRADEFLOW_DEMO_LOGIN !== "off";
}
