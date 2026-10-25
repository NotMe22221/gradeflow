// Serializable shapes passed from the review page (server) to the review
// workspace (client). Pure types: safe to import anywhere.

import type { Confidence, GraderKind } from "@/lib/constants";

export type ReviewFlag = {
  code: string;
  message: string;
  criterionId?: string;
};

export type ReviewCriterion = {
  id: string;
  title: string;
  /** What full credit looks like, written by the teacher. */
  description: string;
  maxPoints: number;
  position: number;
  /** null when the AI score failed validation (or no AI row exists). */
  aiScore: number | null;
  aiJustification: string | null;
  aiEvidence: string | null;
  /** true only when the server verified the quote appears in the paper. */
  evidenceFound: boolean;
  /** Teacher draft values. null means "not edited yet". */
  finalScore: number | null;
  finalComment: string | null;
};

export type ReviewAiSummary = {
  grader: GraderKind;
  model: string | null;
  confidence: Confidence;
  overallComment: string | null;
  flags: ReviewFlag[];
};

export type ReviewItem = {
  id: string;
  /** Untrusted student text. Rendered as text only, never as HTML. */
  content: string;
  fileName: string | null;
  /** ISO timestamp. */
  submittedAt: string;
  wordCount: number;
  student: { id: string; name: string };
  assignment: { id: string; title: string; className: string };
  ai: ReviewAiSummary | null;
  criteria: ReviewCriterion[];
  teacherFeedback: string | null;
};

export type ReviewFilterOption = {
  id: string;
  title: string;
  className: string;
  count: number;
};

/** Draft and approval payload sent to the review server actions. */
export type ReviewPayload = {
  scores: { criterionId: string; score: number | null; comment: string }[];
  feedback: string;
};

export type ActionFailure = { ok: false; error: string };

export type SaveDraftResult = { ok: true; savedAt: string } | ActionFailure;

export type ApproveResult =
  | {
      ok: true;
      totalScore: number;
      maxScore: number;
      studentId: string;
      studentName: string;
      assignmentId: string;
    }
  | ActionFailure;

export type SendBackResult = { ok: true } | ActionFailure;

export type QueueSort = "confidence" | "oldest";
