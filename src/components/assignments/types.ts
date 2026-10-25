// Serializable shapes passed from the assignment page (server) to its client
// components. Pure types: safe to import anywhere.

import type { Confidence, GraderKind } from "@/lib/constants";

/** A validation flag with its teacher-facing wording (see describeFlag). */
export type SubmissionFlag = { code: string; message: string };

export type SubmissionRowData = {
  id: string;
  student: { id: string; name: string };
  /**
   * Submission status. A GRADING claim abandoned by a crashed request is sent
   * as GRADING_FAILED (with `interrupted`) so the teacher can retry it.
   */
  status: string;
  /** True when the AI pass stopped responding mid-grade (stale GRADING claim). */
  interrupted: boolean;
  /** ISO timestamp. Changes when the paper is replaced, so stale live batch state can be ignored. */
  submittedAt: string;
  /** Formatted on the server so the client never re-renders a different time. */
  submittedLabel: string;
  submittedTitle: string;
  fileName: string | null;
  wordCount: number;
  /** Teacher-only AI summary. Never passed to any student-facing view. */
  ai: { confidence: Confidence; grader: GraderKind; flags: SubmissionFlag[] } | null;
  published: { total: number; max: number } | null;
};

export type RosterStudent = { id: string; name: string };

/** A student the teacher can add a paper for (no published grade yet). */
export type EligibleStudent = {
  id: string;
  name: string;
  /** Status of the paper this would replace, or null for a first submission. */
  currentStatus: string | null;
};

export type AddSubmissionResult =
  | { ok: true; studentName: string }
  | { ok: false; error: string; field?: "studentId" | "content" | "file" };

export type LoadSamplesResult = { ok: true; count: number } | { ok: false; error: string };
