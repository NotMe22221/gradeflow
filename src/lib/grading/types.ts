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
  grade(input: GradingInput): Promise<RawGradingResult>;
}

export type ValidationFlagCode =
  | "SCORE_OUT_OF_RANGE" // score < 0, > maxPoints, or not a finite number
  | "EVIDENCE_NOT_FOUND" // quoted evidence does not appear in the paper
  | "MISSING_CRITERION" // grader skipped a rubric criterion
  | "UNKNOWN_CRITERION" // grader returned a criterion id not in the rubric
  | "POSSIBLE_PROMPT_INJECTION" // paper contains text addressed to the grader
  | "INVALID_OUTPUT" // grader output was malformed / refused
  | "SHORT_PAPER"; // paper is too short to grade meaningfully

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
  /** null when no usable evidence was returned. */
  evidence: string | null;
  /** true only if `evidence` was verified to appear in the paper. */
  evidenceFound: boolean;
};

export type ValidatedGrading = {
  criteria: ValidatedCriterion[];
  confidence: Confidence;
  overallComment: string;
  flags: ValidationFlag[];
};
