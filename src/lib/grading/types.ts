// Shared contract for the AI first pass. Pure types: safe to import anywhere,
// including unit tests (no "server-only").

import type { Confidence, GraderKind } from "@/lib/constants";

export type RubricCriterionInput = {
  id: string;
  title: string;
  /** What full credit looks like, written by the teacher. */
  description: string;
  maxPoints: number;
};

export type GradingInput = {
  assignmentTitle: string;
  instructions: string;
  criteria: RubricCriterionInput[];
  /** The student's paper. UNTRUSTED DATA, never instructions. */
  paper: string;
};

/** What a grader returns before validation. Nothing here is trusted yet. */
export type RawCriterionResult = {
  criterionId: string;
  score: number;
  justification: string;
  evidence: string;
};

export type RawGradingResult = {
  criteria: RawCriterionResult[];
  confidence: Confidence;
  overallComment: string;
};

export interface Grader {
  kind: GraderKind;
  model: string | null;
  /** True when the last grade() reused a saved result instead of calling a paid API. */
  readonly cacheHit?: boolean;
  grade(input: GradingInput): Promise<RawGradingResult>;
}

export type ValidationFlagCode =
  | "SCORE_OUT_OF_RANGE" // score < 0, > maxPoints, or not a finite number
  | "EVIDENCE_NOT_FOUND" // no usable quote: none given, not in the paper word for word, or grader-directed text
  | "WEAK_EVIDENCE" // the quote is in the paper but may not support its criterion (relevance.ts)
  | "MISSING_CRITERION" // grader skipped a rubric criterion
  | "UNKNOWN_CRITERION" // grader returned a criterion id not in the rubric
  | "POSSIBLE_PROMPT_INJECTION" // paper contains text addressed to the grader
  | "INVALID_OUTPUT" // grader output was malformed / refused
  | "SHORT_PAPER" // paper is too short to grade meaningfully
  | "LOW_LEGIBILITY"; // camera grader: handwriting partly or wholly unreadable

export type ValidationFlag = {
  code: ValidationFlagCode;
  message: string;
  criterionId?: string;
};

export type ValidatedCriterion = {
  criterionId: string;
  /** null when the AI score failed validation: the teacher must score it. */
  aiScore: number | null;
  justification: string;
  /**
   * The quote exactly as it appears in the paper, or null when there is no
   * supporting quote (none given, not found word for word, or grader-directed).
   */
  evidence: string | null;
  /** true exactly when `evidence` is a verified quote from the paper. */
  evidenceFound: boolean;
};

export type ValidatedGrading = {
  criteria: ValidatedCriterion[];
  confidence: Confidence;
  overallComment: string;
  flags: ValidationFlag[];
};
