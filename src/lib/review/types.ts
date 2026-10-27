// Serializable shapes passed from the review page (server) to the review
// workspace (client). Pure types: safe to import anywhere.

import type { AssignmentKind, Confidence, GraderKind, SubmissionSource } from "@/lib/constants";
import type { StoredFlag } from "@/lib/grading/flags";
import type { Recheck } from "@/lib/review/recheck";

/** A validation flag on the AI suggestion, as stored in AiGrade.flags. */
export type ReviewFlag = StoredFlag;

export type ReviewCriterion = {
  id: string;
  title: string;
  /**
   * What full credit looks like, written by the teacher. For a handwritten
   * test (assignment kind TEST) this is the question's answer key.
   */
  description: string;
  maxPoints: number;
  position: number;
  /** null when the AI score failed validation (or no AI row exists). */
  aiScore: number | null;
  aiJustification: string | null;
  aiEvidence: string | null;
  /** true only when the server verified the quote appears in the paper. */
  evidenceFound: boolean;
  /**
   * Teacher draft values. A saved draft always stores a string comment, so
   * finalComment === null means "not edited yet" and finalScore === null
   * with a non-null finalComment means the teacher cleared the score.
   */
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

/** A stored photo of a scanned page. Ids only: the bytes are served by the image route. */
export type ReviewImage = { id: string; position: number };

export type ReviewItem = {
  id: string;
  /**
   * Untrusted student text. Rendered as text only, never as HTML. For a
   * scanned test (source SCAN) this is the transcription of the photos.
   */
  content: string;
  fileName: string | null;
  /** "TEXT" (pasted or uploaded) or "SCAN" (photos read by the camera grader). */
  source: SubmissionSource;
  /** Page photos in page order; empty for typed papers. */
  images: ReviewImage[];
  /** ISO timestamp. */
  submittedAt: string;
  wordCount: number;
  student: { id: string; name: string };
  assignment: { id: string; title: string; className: string; kind: AssignmentKind };
  ai: ReviewAiSummary | null;
  criteria: ReviewCriterion[];
  teacherFeedback: string | null;
  /** Set when the student resubmitted after the teacher sent the paper back. */
  previousReturn: PreviousReturn | null;
  /** Why this draft is worth a careful look (lib/review/recheck.ts), from stored data only. */
  recheck?: Recheck;
};

/** The teacher's earlier send-back of a resubmitted paper. */
export type PreviousReturn = {
  /** The send-back note, trimmed. Empty if none was stored. */
  note: string;
  /** ISO timestamp. */
  at: string;
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

export type QueueSort = "recheck" | "confidence" | "oldest";
