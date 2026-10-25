"use server";

import { revalidatePath } from "next/cache";

import type {
  ActionFailure,
  ApproveResult,
  SaveDraftResult,
  SendBackResult,
} from "@/components/review/types";
import { AuthError } from "@/lib/auth/session";
import { PublishError } from "@/lib/grades/publish";
import * as review from "@/lib/grades/review";

// Thin wrappers over src/lib/grades/review.ts. Role, ownership, status, and
// input checks all happen there; these map failures to { ok: false, error }.

function failure(error: unknown, fallback: string): ActionFailure {
  if (
    error instanceof AuthError ||
    error instanceof review.ReviewError ||
    error instanceof PublishError
  ) {
    return { ok: false, error: error.message };
  }
  console.error("[review]", fallback, error instanceof Error ? error.message : error);
  return { ok: false, error: fallback };
}

export async function saveReviewDraft(
  submissionId: string,
  payload: unknown
): Promise<SaveDraftResult> {
  try {
    const result = await review.saveReviewDraft(submissionId, payload);
    // No revalidatePath here: a draft changes nothing outside this screen, and
    // re-rendering the layout on every autosave would be wasted work.
    return { ok: true, savedAt: result.savedAt.toISOString() };
  } catch (error) {
    return failure(error, "Couldn't save the draft. Try again in a moment.");
  }
}

export async function approveAndPublish(
  submissionId: string,
  payload: unknown
): Promise<ApproveResult> {
  try {
    const result = await review.approveAndPublish(submissionId, payload);
    revalidatePath("/", "layout");
    return { ok: true, ...result };
  } catch (error) {
    return failure(error, "Couldn't publish this grade. Nothing was published.");
  }
}

export async function sendBackToStudent(
  submissionId: string,
  note: unknown
): Promise<SendBackResult> {
  try {
    await review.sendBackToStudent(submissionId, note);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error, "Couldn't send this paper back. Try again in a moment.");
  }
}
