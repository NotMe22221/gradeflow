// Checking a POST /api/grade multipart form. Pure (no DB, no secrets): the
// route reads the body with readFormDataWithLimit() (lib/http/body.ts), and
// unit tests exercise these checks with Node's built-in FormData and File.
//
// Nothing from the client is trusted: ids are shape-checked here and
// ownership-checked by the pipeline, file counts and sizes are capped, and
// every image's real type comes from its magic bytes, never from the
// declared Content-Type or file name.

import { MAX_PAPER_CHARS, normalizePaperText } from "@/lib/paper";
import {
  MAX_SCAN_IMAGE_BYTES,
  MAX_SCAN_PAGES,
  MAX_UPLOAD_REQUEST_BYTES,
  PHOTO_TOO_LARGE_MESSAGE,
  scanImageProblem,
  scanPhotosProblem,
  sniffImageType,
  type ScanImageType,
} from "@/lib/scan/images";
import { idSchema } from "@/lib/validation/id";

/**
 * Upper bound for the whole request, set under Vercel's 4.5 MB function body
 * limit so every host enforces the same cap (Vercel itself rejects a larger
 * body before the route runs). scanFormPhotosProblem() then holds the photos
 * to MAX_SCAN_PHOTOS_BYTES.
 */
export const MAX_SCAN_REQUEST_BYTES = MAX_UPLOAD_REQUEST_BYTES;

export type ScanFormFields = {
  assignmentId: string;
  studentId: string;
  pages: File[];
  answerKey: File | null;
  /** Demo mode only: what is written on an unknown photo. Normalized; may be empty. */
  transcription: string;
};

export type FormCheck<T> = { ok: true; value: T } | { ok: false; error: string };

function isFile(value: FormDataEntryValue | null): value is File {
  return value !== null && typeof value !== "string";
}

/** An empty file input submits a nameless, zero-byte file: that is "no file", not an empty photo. */
function isUnsetFile(file: File): boolean {
  return file.size === 0 && !file.name;
}

export function readScanForm(form: FormData): FormCheck<ScanFormFields> {
  const assignmentId = idSchema.safeParse(form.get("assignmentId"));
  if (!assignmentId.success) return { ok: false, error: "Choose the assignment this test belongs to." };
  const studentId = idSchema.safeParse(form.get("studentId"));
  if (!studentId.success) return { ok: false, error: "Choose the student whose test this is." };

  const pageEntries = form.getAll("pages");
  if (pageEntries.some((entry) => !isFile(entry))) {
    return { ok: false, error: "Upload the test pages as image files." };
  }
  const pages = (pageEntries as File[]).filter((file) => !isUnsetFile(file));
  if (pages.length === 0) return { ok: false, error: "Add at least one photo of the test." };
  if (pages.length > MAX_SCAN_PAGES) {
    return { ok: false, error: `A scan holds up to ${MAX_SCAN_PAGES} pages. Remove a photo and try again.` };
  }

  const answerKeyEntries = form.getAll("answerKey");
  if (answerKeyEntries.length > 1) return { ok: false, error: "Attach one answer key photo at most." };
  const answerKeyEntry = answerKeyEntries[0] ?? null;
  if (answerKeyEntry !== null && !isFile(answerKeyEntry) && answerKeyEntry !== "") {
    return { ok: false, error: "Upload the answer key as an image file." };
  }
  const answerKey = isFile(answerKeyEntry) && !isUnsetFile(answerKeyEntry) ? answerKeyEntry : null;

  const rawTranscription = form.get("transcription");
  if (rawTranscription !== null && typeof rawTranscription !== "string") {
    return { ok: false, error: "The transcription must be text." };
  }
  const transcription = normalizePaperText(rawTranscription ?? "");
  if (transcription.length > MAX_PAPER_CHARS) {
    return {
      ok: false,
      error: `Transcriptions are limited to ${MAX_PAPER_CHARS.toLocaleString("en-US")} characters.`,
    };
  }

  return {
    ok: true,
    value: { assignmentId: assignmentId.data, studentId: studentId.data, pages, answerKey, transcription },
  };
}

/** The pages and answer key photo together must fit one scan request (null when they do). */
export function scanFormPhotosProblem(fields: Pick<ScanFormFields, "pages" | "answerKey">): string | null {
  const sizes = fields.pages.map((file) => file.size);
  if (fields.answerKey) sizes.push(fields.answerKey.size);
  return scanPhotosProblem(sizes);
}

export type CheckedImage = {
  bytes: Uint8Array<ArrayBuffer>;
  /** Sniffed from the bytes, never taken from the client. */
  mimeType: ScanImageType;
};

/** Check image bytes. `label` names the photo in the error ("Page 2", "Answer key photo"). */
export function checkScanImage(bytes: Uint8Array<ArrayBuffer>, label: string): FormCheck<CheckedImage> {
  const problem = scanImageProblem(bytes);
  if (problem) return { ok: false, error: `${label}: ${problem}` };
  const mimeType = sniffImageType(bytes);
  if (!mimeType) return { ok: false, error: `${label}: Upload a JPEG, PNG, or WebP photo.` };
  return { ok: true, value: { bytes, mimeType } };
}

/** Read and check one uploaded photo. Oversized files are rejected before they are read. */
export async function readScanImage(file: File, label: string): Promise<FormCheck<CheckedImage>> {
  if (file.size > MAX_SCAN_IMAGE_BYTES) {
    return { ok: false, error: `${label}: ${PHOTO_TOO_LARGE_MESSAGE}` };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return checkScanImage(bytes, label);
}

export function pageLabel(index: number): string {
  return `Page ${index + 1}`;
}

export const ANSWER_KEY_LABEL = "Answer key photo";
