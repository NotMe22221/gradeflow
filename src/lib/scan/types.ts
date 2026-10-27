// The POST /api/grade contract, shared by the route and the /scan page.
// Pure types and constants: safe for client components and unit tests.

import type { Confidence, GraderKind } from "@/lib/constants";

/** Engines that grade scanned tests: GPT-4o, Claude, or the demo scanner. */
export type ScanGrader = GraderKind;

/** Which engine reads scanned photos right now (engineFor("vision")), for the scanner's copy. */
export type ScanEngineInfo = { kind: ScanGrader; model: string | null };

/** Where the stored transcription came from. */
export type TranscriptionSource = "vision" | "sample" | "typed";

export type ScanErrorCode = "NEEDS_TRANSCRIPTION";

export const NEEDS_TRANSCRIPTION_MESSAGE =
  "Demo mode can't read handwriting. Type what's on the page, or set ANTHROPIC_API_KEY to read photos with Claude.";

/** POST /api/grade answers 422 with this for an essay: the scanner grades against an answer key. */
export const NOT_A_TEST_MESSAGE =
  "The scanner grades handwritten tests only. Add essays as typed papers on the assignment page.";

export type ScanGradeSuccess = {
  ok: true;
  submissionId: string;
  status: "NEEDS_REVIEW";
  grader: ScanGrader;
  model: string | null;
  confidence: Confidence;
  flagCount: number;
  // Extra detail for the result card.
  assignmentId: string;
  assignmentTitle: string;
  studentName: string;
  pageCount: number;
  transcriptionSource: TranscriptionSource;
  /** The first lines of the stored transcription. */
  transcriptionPreview: string[];
  transcriptionLineCount: number;
  /** Teacher-facing flag messages (never echo text injected into the page). */
  flags: string[];
  /** Sum of the valid AI draft scores; null when no score passed validation. */
  draftScore: number | null;
  maxScore: number;
  /** Questions whose AI score failed validation and need a teacher score. */
  unscoredCount: number;
};

export type ScanGradeFailure = { ok: false; error: string; code?: ScanErrorCode };

export type ScanGradeResponse = ScanGradeSuccess | ScanGradeFailure;

/** Lines of transcription returned for the result card. */
export const TRANSCRIPTION_PREVIEW_LINES = 4;
