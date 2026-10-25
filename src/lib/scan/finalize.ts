// Validation for camera-graded tests. Pure: safe for unit tests.
//
// Both scan engines (GPT-4o vision and the demo scanner) go through the same
// validateGrading() as typed essays: every score is range checked against the
// rubric, every quote must appear in the transcription, and text addressed to
// the grader is flagged. On top of that:
//  - SHORT_PAPER is dropped: short written answers are normal on a test.
//  - Handwriting the model could not fully read raises LOW_LEGIBILITY, and the
//    confidence self-report is capped to match (illegible -> low,
//    partly legible -> at most medium).

import type { Confidence } from "@/lib/constants";
import type { GradingInput, RawGradingResult, ValidatedGrading, ValidationFlag } from "@/lib/grading/types";
import { validateGrading } from "@/lib/grading/validate";
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

/** `input.paper` must be the transcription that is stored as the submission's content. */
export function validateScanGrading(
  raw: RawGradingResult,
  input: GradingInput,
  legibility: Legibility
): ValidatedGrading {
  const validated = validateGrading(raw, input);
  const flags: ValidationFlag[] = validated.flags.filter((flag) => flag.code !== "SHORT_PAPER");
  if (legibility !== "clear") {
    flags.unshift({ code: "LOW_LEGIBILITY", message: LOW_LEGIBILITY_MESSAGES[legibility] });
  }
  return { ...validated, confidence: capConfidence(validated.confidence, legibility), flags };
}
