import "server-only";

import { db } from "@/lib/db";

/**
 * Submission intake shared by the teacher "Add submission" flow and the
 * student submit form. Paper text is stored verbatim as untrusted data.
 */

export const MAX_PAPER_CHARS = 40_000;
export const MIN_PAPER_CHARS = 20;

export type IntakeResult = { ok: true; submissionId: string } | { ok: false; error: string };

/** Normalize pasted or uploaded text without changing its meaning. */
export function normalizePaperText(raw: string): string {
  return raw
    .replace(/^﻿/, "") // byte-order mark
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/** Validate a .txt upload from a server action's FormData. */
export async function readTxtUpload(file: File | null): Promise<{ text: string; fileName: string } | { error: string } | null> {
  if (!file || file.size === 0) return null;
  const name = file.name || "paper.txt";
  if (!name.toLowerCase().endsWith(".txt") || (file.type && file.type !== "text/plain")) {
    return { error: "Upload a plain-text .txt file." };
  }
  if (file.size > MAX_PAPER_CHARS * 4) return { error: "That file is too large for one paper." };
  const text = await file.text();
  return { text, fileName: name };
}

export function validatePaperText(text: string): string | null {
  if (text.length < MIN_PAPER_CHARS) return "That paper looks empty. Paste the full text or upload a .txt file.";
  if (text.length > MAX_PAPER_CHARS) return `Papers are limited to ${MAX_PAPER_CHARS.toLocaleString()} characters.`;
  return null;
}

/**
 * Create a submission, or replace a previous one when the student resubmits
 * after being sent back. Published grades are never overwritten: a published
 * submission cannot be replaced.
 */
export async function upsertSubmission(input: {
  assignmentId: string;
  studentId: string;
  content: string;
  fileName?: string | null;
}): Promise<IntakeResult> {
  const content = normalizePaperText(input.content);
  const problem = validatePaperText(content);
  if (problem) return { ok: false, error: problem };

  const existing = await db.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId: input.assignmentId, studentId: input.studentId } },
    select: { id: true, status: true },
  });

  if (existing) {
    if (existing.status === "PUBLISHED" || existing.status === "APPROVED") {
      return { ok: false, error: "This paper already has a published grade." };
    }
    if (existing.status === "GRADING") {
      return { ok: false, error: "This paper is being graded right now. Try again in a moment." };
    }
    // Resubmission: clear the previous AI pass and review state.
    const submission = await db.$transaction(async (tx) => {
      await tx.aiGrade.deleteMany({ where: { submissionId: existing.id } });
      await tx.criterionScore.deleteMany({ where: { submissionId: existing.id } });
      return tx.submission.update({
        where: { id: existing.id },
        data: {
          content,
          fileName: input.fileName ?? null,
          submittedAt: new Date(),
          status: "SUBMITTED",
          teacherFeedback: null,
          approvedAt: null,
          approvedById: null,
          // Keep returnNote/returnedAt so the history of the send-back is visible.
        },
        select: { id: true },
      });
    });
    return { ok: true, submissionId: submission.id };
  }

  const created = await db.submission.create({
    data: {
      assignmentId: input.assignmentId,
      studentId: input.studentId,
      content,
      fileName: input.fileName ?? null,
      status: "SUBMITTED",
    },
    select: { id: true },
  });
  return { ok: true, submissionId: created.id };
}
