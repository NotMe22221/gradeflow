// Scanned handwritten tests in the review queue: page photos, the
// transcription caption, and test-specific wording. Pure: safe for client
// components, server code, and unit tests.

import { type AssignmentKind, type GraderKind, type SubmissionSource } from "@/lib/constants";
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

export type TranscriptionCaption = { tone: "ai" | "demo"; text: string };

/**
 * The caption above a scanned test's transcription. Demo output is never
 * described as AI, so a placeholder transcription is not mistaken for a real read.
 */
export function transcriptionCaption(grader: GraderKind | null | undefined): TranscriptionCaption {
  if (grader === "openai") return { tone: "ai", text: "Transcribed by GPT-4o. Check it against the photo." };
  if (grader === "demo") {
    return { tone: "demo", text: "Demo transcription: stored with the sample photo, not read by AI. Check it against the photo." };
  }
  return { tone: "ai", text: "Transcribed from the photo. Check it against the photo." };
}

/** The heading over a criterion's full-credit description in the rubric pane. */
export function criterionGuideLabel(kind: AssignmentKind): string {
  return kind === "TEST" ? "Answer key" : "What full credit looks like";
}
