// Scanned handwritten tests in the review queue: page photos, the
// transcription caption, and test-specific wording. Pure: safe for client
// components, server code, and unit tests.

import { GRADER_LABELS, type AssignmentKind } from "@/lib/constants";
import type { ReviewImage, ReviewItem } from "@/lib/review/types";

export { parseSubmissionSource } from "@/lib/constants";

/** Page photos in page order, ids only (never the image bytes). */
export function toReviewImages(rows: { id: string; position: number }[]): ReviewImage[] {
  return [...rows]
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
    .map(({ id, position }) => ({ id, position }));
}

/** Where the image route serves a stored page photo (teacher or owning student only). */
export function submissionImageUrl(submissionId: string, imageId: string): string {
  return `/api/submissions/${encodeURIComponent(submissionId)}/images/${encodeURIComponent(imageId)}`;
}

/** Alt text for page `pageNumber` (1-based) of a student's scanned test. */
export function pageImageAlt(studentName: string, pageNumber: number): string {
  return `Page ${pageNumber} of ${studentName}'s test`;
}

/** True when the teacher can compare the transcription with the original photos. */
export function hasPagePhotos(item: Pick<ReviewItem, "images">): boolean {
  return item.images.length > 0;
}

export function isScanned(item: Pick<ReviewItem, "source" | "images">): boolean {
  return item.source === "SCAN" || item.images.length > 0;
}

export type TranscriptionCaption = { tone: "ai" | "demo" | "neutral"; text: string };

/**
 * AiGrade.model markers for demo scans. The demo scanner reads no
 * handwriting: it uses a bundled sample photo's stored transcription or the
 * text the teacher typed in the scanner. Storing which one lets the review
 * queue describe the transcription truthfully. Demo scans saved without a
 * marker (model null) get wording that covers both.
 */
export const DEMO_SCAN_MODELS = { sample: "demo-sample", typed: "demo-typed" } as const;

export type DemoTranscriptionSource = keyof typeof DEMO_SCAN_MODELS;

/** The AiGrade.model value to store for a demo scan. */
export function demoScanModel(source: DemoTranscriptionSource): string {
  return DEMO_SCAN_MODELS[source];
}

function photoCheck(photoCount: number): string {
  if (photoCount === 0) return "The page photos are not on file.";
  return photoCount === 1 ? "Check it against the photo." : "Check it against the photos.";
}

/**
 * The caption above a scanned test's transcription, derived from what is
 * stored: the grader, the model marker, and the page photos. Demo output is
 * never described as AI, and the caption never claims a source the data
 * cannot back up.
 */
export function transcriptionCaption(item: Pick<ReviewItem, "ai" | "images">): TranscriptionCaption {
  const check = photoCheck(item.images.length);
  const grader = item.ai?.grader;
  // Only GPT-4o is certain: "claude" is stored both by Claude's camera grader
  // and by a re-run of the AI pass on text already transcribed, so it gets
  // the neutral caption below.
  if (grader === "openai") {
    return { tone: "ai", text: `Transcribed by ${GRADER_LABELS.openai}. ${check}` };
  }
  if (grader === "demo") {
    const model = item.ai?.model;
    if (model === DEMO_SCAN_MODELS.typed) {
      return { tone: "demo", text: `Demo transcription: typed in the scanner, not read by AI. ${check}` };
    }
    if (model === DEMO_SCAN_MODELS.sample) {
      return { tone: "demo", text: `Demo transcription: stored with the sample photo, not read by AI. ${check}` };
    }
    return {
      tone: "demo",
      text: `Demo transcription, not read by AI: a sample photo's stored text or what was typed in the scanner. ${check}`,
    };
  }
  // No vision record to go on: say only what is certain.
  return { tone: "neutral", text: `Transcription of the scanned test. ${check}` };
}

/** "transcription" for a scanned test, "paper" for a typed one. */
export function paperNounFor(item: Pick<ReviewItem, "source" | "images">): "paper" | "transcription" {
  return isScanned(item) ? "transcription" : "paper";
}

/** The heading over a criterion's full-credit description in the rubric pane. */
export function criterionGuideLabel(kind: AssignmentKind): string {
  return kind === "TEST" ? "Answer key" : "What full credit looks like";
}
