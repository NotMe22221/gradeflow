"use server";

import { refresh, revalidatePath } from "next/cache";

import { AuthError } from "@/lib/auth/session";
import { PublishError } from "@/lib/grades/publish";
import * as review from "@/lib/grades/review";
import type {
  ActionFailure,
  ApproveResult,
  SaveDraftResult,
  SendBackResult,
} from "@/lib/review/types";

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
  // Log the error type only: messages can carry teacher comments about a student.
  console.error("[gradeflow] Review action failed", {
    type: error instanceof Error ? error.name : typeof error,
  });
  return { ok: false, error: fallback };
}

export async function saveReviewDraft(
  submissionId: string,
  payload: unknown
): Promise<SaveDraftResult> {
  try {
    const result = await review.saveReviewDraft(submissionId, payload);
    // Refresh this page's client cache. Without it, Back/Forward to /review
    // replays the payload from the first visit, and the workspace would
    // rebuild its drafts from stale scores. The open workspace keeps its
    // in-memory drafts, which win over the refreshed props.
    refresh();
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
