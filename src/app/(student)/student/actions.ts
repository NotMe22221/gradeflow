"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getEnrolledAssignment } from "@/lib/access";
import { AuthError, requireStudent } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  MAX_PAPER_CHARS,
  readTxtUpload,
  STUDENT_REPLACEABLE_STATUSES,
  upsertSubmission,
} from "@/lib/submissions";
import { idSchema } from "@/lib/validation/id";

export type SubmitPaperResult = { ok: true } | { ok: false; error: string };

const ModeSchema = z.enum(["paste", "upload"]);

// Generous headroom over the stored limit so normalization (CRLF, trailing
// spaces) can bring a borderline paste under it; upsertSubmission enforces
// the real limit on the normalized text.
const PastedTextSchema = z.string().max(MAX_PAPER_CHARS * 2, "That paper is too long to submit.");

/**
 * Submit (or, after a send-back, resubmit) the signed-in student's paper.
 *
 * The student and assignment are re-checked on the server: the student must
 * be enrolled in the assignment's class, and a paper can only be replaced
 * after the teacher sent it back. The paper itself is stored verbatim as
 * untrusted data.
 */
export async function submitPaper(assignmentId: string, formData: FormData): Promise<SubmitPaperResult> {
  try {
    const student = await requireStudent();

    const id = idSchema.safeParse(assignmentId);
    if (!id.success) return { ok: false, error: "Assignment not found." };
    const assignment = await getEnrolledAssignment(student.id, id.data);

    const mode = ModeSchema.safeParse(formData.get("mode"));
    if (!mode.success) return { ok: false, error: "Paste your paper or upload a .txt file." };

    let content: string;
    let fileName: string | null = null;
    if (mode.data === "upload") {
      const file = formData.get("file");
      const upload = await readTxtUpload(file instanceof File ? file : null);
      if (!upload) return { ok: false, error: "Choose a .txt file to upload." };
      if ("error" in upload) return { ok: false, error: upload.error };
      content = upload.text;
      fileName = upload.fileName.slice(0, 200);
    } else {
      const raw = formData.get("content");
      const pasted = PastedTextSchema.safeParse(typeof raw === "string" ? raw : "");
      if (!pasted.success) {
        return { ok: false, error: pasted.error.issues[0]?.message ?? "Check your paper." };
      }
      content = pasted.data;
    }

    const existing = await db.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
      select: { status: true },
    });
    if (existing && existing.status !== "RETURNED") {
      return {
        ok: false,
        error:
          existing.status === "PUBLISHED"
            ? "This paper already has a published grade."
            : "You already submitted this paper. Your teacher is reviewing it.",
      };
    }

    const result = await upsertSubmission({
      assignmentId: assignment.id,
      studentId: student.id,
      content,
      fileName,
      replaceable: STUDENT_REPLACEABLE_STATUSES,
    });
    if (!result.ok) return { ok: false, error: result.error };
  } catch (error) {
    if (error instanceof AuthError) return { ok: false, error: error.message };
    // Never log the paper itself: it is student data.
    console.error("[gradesmart] Student submission failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return { ok: false, error: "Your paper could not be submitted. Try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
