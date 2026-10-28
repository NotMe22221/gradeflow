import { NextResponse } from "next/server";

import { aiLimitResponse } from "@/lib/ai/guard";
import { AiLimitError } from "@/lib/ai/usage";
import { AuthError, requireTeacher } from "@/lib/auth/session";
import { readFormDataWithLimit } from "@/lib/http/body";
import {
  ANSWER_KEY_LABEL,
  MAX_SCAN_REQUEST_BYTES,
  pageLabel,
  readScanForm,
  readScanImage,
  scanFormPhotosProblem,
  type CheckedImage,
} from "@/lib/scan/form";
import { gradeScannedTest, ScanError } from "@/lib/scan/grade";
import { SCAN_PHOTOS_TOO_LARGE_MESSAGE } from "@/lib/scan/images";
import type { ScanErrorCode, ScanGradeFailure, ScanGradeSuccess } from "@/lib/scan/types";

export const dynamic = "force-dynamic";
// Reading a test usually takes 10-30 seconds. The vision call (GPT-4o or
// Claude) is capped at 110 seconds, retries included (OPENAI_BUDGETS.vision,
// CLAUDE_TASK_BUDGETS.vision), so the route always answers with JSON before
// this limit.
export const maxDuration = 120;

function errorResponse(error: string, status: number, code?: ScanErrorCode) {
  const body: ScanGradeFailure = code ? { ok: false, error, code } : { ok: false, error };
  return NextResponse.json(body, { status });
}

/**
 * The AI Paper-Grading Camera. Teacher only, multipart/form-data:
 * assignmentId, studentId, pages (1-4 photos), optional answerKey photo, and
 * optional transcription (demo mode only).
 *
 * The graded draft lands in the review queue as NEEDS_REVIEW. Nothing is
 * published from here: publishing needs an explicit teacher approval. The
 * live vision call goes through the usage caps (lib/ai/guard.ts): past one,
 * the route answers 429 with Retry-After, or 503 when waiting won't help
 * (kill switch, a call larger than the daily budget).
 */
export async function POST(request: Request) {
  try {
    const user = await requireTeacher();

    // The same limits on every host, set under Vercel's 4.5 MB function body
    // limit (Vercel rejects a larger body before this runs). The browser
    // shrinks the photos to fit before it sends them.
    let form: FormData | null;
    try {
      form = await readFormDataWithLimit(request, MAX_SCAN_REQUEST_BYTES);
    } catch {
      return errorResponse("Send the test photos as a multipart form.", 400);
    }
    if (!form) return errorResponse(SCAN_PHOTOS_TOO_LARGE_MESSAGE, 413);

    const fields = readScanForm(form);
    if (!fields.ok) return errorResponse(fields.error, 400);
    const tooLarge = scanFormPhotosProblem(fields.value);
    if (tooLarge) return errorResponse(tooLarge, 413);

    const pages: CheckedImage[] = [];
    for (const [index, file] of fields.value.pages.entries()) {
      const checked = await readScanImage(file, pageLabel(index));
      if (!checked.ok) return errorResponse(checked.error, 400);
      pages.push(checked.value);
    }
    let answerKey: CheckedImage | null = null;
    if (fields.value.answerKey) {
      const checked = await readScanImage(fields.value.answerKey, ANSWER_KEY_LABEL);
      if (!checked.ok) return errorResponse(checked.error, 400);
      answerKey = checked.value;
    }

    const result: ScanGradeSuccess = await gradeScannedTest(user.id, {
      assignmentId: fields.value.assignmentId,
      studentId: fields.value.studentId,
      pages,
      answerKey,
      transcription: fields.value.transcription,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof ScanError) return errorResponse(error.message, error.status, error.code);
    if (error instanceof AiLimitError) return aiLimitResponse(error);
    console.error("[markwise] Scan route failed", { type: error instanceof Error ? error.name : typeof error });
    return errorResponse("Grading the scan failed. Try again.", 500);
  }
}
