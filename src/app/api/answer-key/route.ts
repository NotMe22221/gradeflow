import { NextResponse } from "next/server";

import { AnswerKeyError, readAnswerKeyDemo, readAnswerKeyWithOpenAI } from "@/app/api/answer-key/read";
import { describeOpenAiError, openAiConfigured } from "@/lib/ai/openai";
import { AuthError, requireTeacher } from "@/lib/auth/session";
import { readFormDataWithLimit } from "@/lib/http/body";
import { AI_RATE_LIMITS, checkRateLimit, rateLimitMessage } from "@/lib/http/rate-limit";
import type { AnswerKeyFailure, AnswerKeySuccess } from "@/lib/scan/answer-key";
import {
  MAX_SCAN_IMAGE_BYTES,
  MAX_UPLOAD_REQUEST_BYTES,
  PHOTO_TOO_LARGE_MESSAGE,
  scanImageProblem,
  sniffImageType,
} from "@/lib/scan/images";

export const dynamic = "force-dynamic";
// The GPT-4o call is capped at 110 seconds, retries included (OPENAI_BUDGETS.vision).
export const maxDuration = 120;

/**
 * One photo and its multipart envelope: the same limit on every host, set
 * under Vercel's 4.5 MB function body limit (Vercel rejects a larger body
 * before this runs). The browser shrinks the photo to fit before it sends it.
 */
const MAX_BODY_BYTES = MAX_UPLOAD_REQUEST_BYTES;

function errorResponse(error: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json<AnswerKeyFailure>(
    { ok: false, error },
    { status, headers: { "Cache-Control": "no-store", ...headers } }
  );
}

/**
 * Read a photo of a teacher's answer key and return its questions for the
 * rubric builder (teacher only). Nothing is saved here: the teacher reviews
 * and edits the questions, then creates the assignment.
 *
 * With OPENAI_API_KEY: GPT-4o vision with structured output. Without it: the
 * demo reader, which only recognizes the bundled sample answer key.
 */
export async function POST(request: Request) {
  try {
    const user = await requireTeacher();

    // Live GPT-4o calls cost money: they share the camera grader's per-teacher cap.
    if (openAiConfigured()) {
      const limited = checkRateLimit(`${user.id}:vision`, AI_RATE_LIMITS.vision);
      if (!limited.ok) {
        return errorResponse(rateLimitMessage(limited.retryAfterSeconds), 429, {
          "Retry-After": String(limited.retryAfterSeconds),
        });
      }
    }

    // Never buffers more than the limit, even for a chunked upload with no Content-Length.
    let form: FormData | null;
    try {
      form = await readFormDataWithLimit(request, MAX_BODY_BYTES);
    } catch {
      return errorResponse("Upload a photo of the answer key.", 400);
    }
    if (!form) return errorResponse(PHOTO_TOO_LARGE_MESSAGE, 413);

    const files = form.getAll("image").filter((value): value is File => value instanceof File);
    if (files.length !== 1) return errorResponse("Upload one photo of the answer key.", 400);
    const [file] = files;
    if (file.size > MAX_SCAN_IMAGE_BYTES) return errorResponse(PHOTO_TOO_LARGE_MESSAGE, 413);

    // The declared type and file name are never trusted: check the bytes.
    const bytes = new Uint8Array(await file.arrayBuffer());
    const problem = scanImageProblem(bytes);
    const mimeType = sniffImageType(bytes);
    if (problem || !mimeType) return errorResponse(problem ?? "Upload a JPEG, PNG, or WebP photo.", 400);

    let result: AnswerKeySuccess;
    if (openAiConfigured()) {
      try {
        result = await readAnswerKeyWithOpenAI(bytes, mimeType);
      } catch (error) {
        if (error instanceof AnswerKeyError) return errorResponse(error.message, error.status);
        return errorResponse(describeOpenAiError(error, "Answer key import"), 502);
      }
    } else {
      result = readAnswerKeyDemo(bytes);
    }

    return NextResponse.json<AnswerKeySuccess>(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof AnswerKeyError) return errorResponse(error.message, error.status);
    // Log the error type only: never the photo, the key, or request headers.
    console.error("[gradesmart] Answer key route failed", { type: error instanceof Error ? error.name : typeof error });
    return errorResponse("The answer key could not be read. Try again.", 500);
  }
}
