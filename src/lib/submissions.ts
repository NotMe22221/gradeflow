import "server-only";

import { db, transaction } from "@/lib/db";
import type { SubmissionStatus } from "@/lib/constants";
import {
  MAX_PAPER_CHARS,
  MIN_PAPER_CHARS,
  normalizePaperText,
  txtFileProblem,
  validatePaperText,
} from "@/lib/paper";
import { stripNul, stripNulOptional } from "@/lib/text/sanitize";

/**
 * Submission intake shared by the teacher "Add submission" flow and the
 * student submit form. Paper text is stored verbatim as untrusted data.
 * The rules themselves live in src/lib/paper.ts so client forms share them.
 */

export { MAX_PAPER_CHARS, MIN_PAPER_CHARS, normalizePaperText, validatePaperText };

export type IntakeResult =
  | {
      ok: true;
      submissionId: string;
      /** True when this call created the paper; false when it replaced an existing one. */
      created: boolean;
    }
  | { ok: false; error: string };

/** Shown when another request created or changed this paper between our check and our write. */
const CHANGED_MESSAGE = "This paper changed a moment ago. Refresh and try again.";

/** Statuses a teacher may replace a paper in. Published grades are never overwritten. */
export const TEACHER_REPLACEABLE_STATUSES: SubmissionStatus[] = [
  "SUBMITTED",
  "GRADING_FAILED",
  "NEEDS_REVIEW",
  "RETURNED",
];

/** A student may only resubmit after the teacher sent the paper back. */
export const STUDENT_REPLACEABLE_STATUSES: SubmissionStatus[] = ["RETURNED"];

/** Validate a .txt upload from a server action's FormData. */
export async function readTxtUpload(
  file: File | null
): Promise<{ text: string; fileName: string } | { error: string } | null> {
  if (!file || file.size === 0) return null;
  const problem = txtFileProblem(file);
  if (problem) return { error: problem };
  const text = await file.text();
  // A crafted multipart file name could carry NUL, which Postgres can't store.
  return { text, fileName: stripNul(file.name) || "paper.txt" };
}

class SubmissionConflict extends Error {}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

/**
 * Create a submission, or replace an existing one whose status is in
 * `replaceable` (e.g. a student resubmitting after being sent back). The
 * status check and the overwrite happen atomically, so a paper that was
 * approved, published, or claimed for grading a moment ago is never replaced.
 * A new paper relies on the (assignmentId, studentId) unique key instead: if
 * another request created it first, this one reports the conflict.
 */
export async function upsertSubmission(input: {
  assignmentId: string;
  studentId: string;
  content: string;
  fileName?: string | null;
  replaceable: SubmissionStatus[];
}): Promise<IntakeResult> {
  const content = normalizePaperText(input.content);
  const problem = validatePaperText(content);
  if (problem) return { ok: false, error: problem };
  const fileName = stripNulOptional(input.fileName) ?? null;

  const existing = await db.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId: input.assignmentId, studentId: input.studentId } },
    select: { id: true, status: true },
  });

  if (!existing) {
    try {
      const created = await db.submission.create({
        data: {
          assignmentId: input.assignmentId,
          studentId: input.studentId,
          content,
          fileName,
          status: "SUBMITTED",
        },
        select: { id: true },
      });
      return { ok: true, submissionId: created.id, created: true };
    } catch (error) {
      // The (assignmentId, studentId) unique key is the real check here:
      // another request (a second tab, or the teacher adding the paper)
      // created this paper between the lookup above and this insert.
      if (isUniqueViolation(error)) return { ok: false, error: CHANGED_MESSAGE };
      throw error;
    }
  }

  // Friendly messages for the common cases; the guarded update below is the
  // real check.
  if (existing.status === "PUBLISHED" || existing.status === "APPROVED") {
    return { ok: false, error: "This paper already has a published grade." };
  }
  if (existing.status === "GRADING") {
    return { ok: false, error: "This paper is being graded right now. Try again in a moment." };
  }
  if (!input.replaceable.includes(existing.status as SubmissionStatus)) {
    return { ok: false, error: "This paper is already with your teacher." };
  }

  try {
    await transaction(async (tx) => {
      const claimed = await tx.submission.updateMany({
        where: { id: existing.id, status: { in: input.replaceable } },
        data: {
          content,
          fileName,
          // Typed text replaces a scan entirely: it is no longer a photo transcription.
          source: "TEXT",
          submittedAt: new Date(),
          status: "SUBMITTED",
          teacherFeedback: null,
          approvedAt: null,
          approvedById: null,
          // Keep returnNote/returnedAt so the history of the send-back is visible.
        },
      });
      if (claimed.count !== 1) throw new SubmissionConflict();
      // The previous AI pass, draft edits, and any scanned photos belong to the old paper.
      await tx.aiGrade.deleteMany({ where: { submissionId: existing.id } });
      await tx.criterionScore.deleteMany({ where: { submissionId: existing.id } });
      await tx.submissionImage.deleteMany({ where: { submissionId: existing.id } });
    });
  } catch (error) {
    if (error instanceof SubmissionConflict) return { ok: false, error: CHANGED_MESSAGE };
    throw error;
  }
  return { ok: true, submissionId: existing.id, created: false };
}
