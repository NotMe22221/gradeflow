import { NextResponse } from "next/server";

import { AnswerKeyError, readAnswerKeyDemo, readAnswerKeyWithOpenAI } from "@/app/api/answer-key/read";
import { describeOpenAiError, openAiConfigured } from "@/lib/ai/openai";
import { AuthError, requireTeacher } from "@/lib/auth/session";
import type { AnswerKeyFailure, AnswerKeySuccess } from "@/lib/scan/answer-key";
import { MAX_SCAN_IMAGE_BYTES, scanImageProblem, sniffImageType } from "@/lib/scan/images";

export const dynamic = "force-dynamic";

/** Room for the multipart envelope around one maximum-size photo. */
const MAX_BODY_BYTES = MAX_SCAN_IMAGE_BYTES + 256 * 1024;

function errorResponse(error: string, status: number) {
  return NextResponse.json<AnswerKeyFailure>({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });
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
    await requireTeacher();

    const declared = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      return errorResponse("That photo is larger than 5 MB. Try a smaller photo.", 413);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return errorResponse("Upload a photo of the answer key.", 400);
    }

    const files = form.getAll("image").filter((value): value is File => value instanceof File);
    if (files.length !== 1) return errorResponse("Upload one photo of the answer key.", 400);
    const [file] = files;
    if (file.size > MAX_SCAN_IMAGE_BYTES) {
      return errorResponse("That photo is larger than 5 MB. Try a smaller photo.", 400);
    }

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
