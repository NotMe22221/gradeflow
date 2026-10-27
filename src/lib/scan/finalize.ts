// Grading and validation for handwritten tests (TEST assignments), whether
// the answers came from photos or were typed in. Pure: safe for unit tests.
//
// Every engine (GPT-4o or Claude vision, the demo scanner, Claude on typed answers)
// goes through the same validateGrading() as typed essays: every score is
// range checked against the rubric, every quote must appear in the paper, and
// text addressed to the grader is flagged. On top of that:
//  - A short quote counts as found when it is a whole answer line ("Q2. O
//    horizon"): one-word answers are normal on a test.
//  - SHORT_PAPER is dropped: short written answers are normal on a test.
//  - Handwriting the model could not fully read raises LOW_LEGIBILITY, and the
//    confidence self-report is capped to match (illegible -> low,
//    partly legible -> at most medium).

import type { Confidence } from "@/lib/constants";
import { findTestEvidenceSpan } from "@/lib/grading/evidence";
import type { Grader, GradingInput, RawGradingResult, ValidatedGrading, ValidationFlag } from "@/lib/grading/types";
import { validateGrading } from "@/lib/grading/validate";
import { gradeScanWithDemo } from "@/lib/scan/demo-grader";
import type { Legibility } from "@/lib/scan/vision-prompt";

export const LOW_LEGIBILITY_MESSAGES: Record<Exclude<Legibility, "clear">, string> = {
  partly_legible: "Some of the handwriting was hard to read. Check the transcription against the photo before approving.",
  illegible: "Most of the handwriting could not be read. Check every answer against the photo, or grade this test by hand.",
};

function capConfidence(confidence: Confidence, legibility: Legibility): Confidence {
  if (legibility === "illegible") return "low";
  if (legibility === "partly_legible" && confidence === "high") return "medium";
  return confidence;
}

/** `input.paper` must be the transcription (or typed answers) stored as the submission's content. */
export function validateScanGrading(
  raw: RawGradingResult,
  input: GradingInput,
  legibility: Legibility
): ValidatedGrading {
  const validated = validateGrading(raw, input, findTestEvidenceSpan, { checkRelevance: false });
  const flags: ValidationFlag[] = validated.flags.filter((flag) => flag.code !== "SHORT_PAPER");
  if (legibility !== "clear") {
    flags.unshift({ code: "LOW_LEGIBILITY", message: LOW_LEGIBILITY_MESSAGES[legibility] });
  }
  return { ...validated, confidence: capConfidence(validated.confidence, legibility), flags };
}

/**
 * The AI first pass for typed answers on a handwritten test. The demo engine
 * is the demo scanner's answer-key matcher, not the essay heuristics, so a
 * correct one-line answer is not graded as a too-short essay. A real model
 * (Claude) grades the answers against the same rubric. Either way the result
 * is validated like a scanned test.
 */
export async function gradeTestAnswers(grader: Pick<Grader, "kind" | "grade">, input: GradingInput): Promise<ValidatedGrading> {
  const raw = grader.kind === "demo" ? gradeScanWithDemo(input) : await grader.grade(input);
  return validateScanGrading(raw, input, "clear");
}
