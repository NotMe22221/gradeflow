"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getEnrolledAssignment } from "@/lib/access";
import { AuthError, requireStudent } from "@/lib/auth/session";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";
import { parseAssignmentKind } from "@/lib/constants";
import { db, transaction } from "@/lib/db";
import { awardXp } from "@/lib/gamification/award";
import { XP_RULES } from "@/lib/gamification/rules";
import { awardSubmissionXp } from "@/lib/gamification/submission-xp";
import {
  MAX_PAPER_CHARS,
  normalizePaperText,
  readTxtUpload,
  STUDENT_REPLACEABLE_STATUSES,
  upsertSubmission,
  validatePaperText,
} from "@/lib/submissions";
import { idSchema } from "@/lib/validation/id";

export type SubmitPaperResult =
  | {
      ok: true;
      /** XP earned for this submission (0 when none was due). Engagement only, never part of a grade. */
      xpAwarded: number;
      /** True when the on-time bonus was part of xpAwarded. */
      onTime: boolean;
    }
  | {
      ok: false;
      error: string;
      /**
       * True when the paper's state changed on the server (turned in from
       * another tab, added by the teacher, graded, or published), so the
       * page the student is looking at is out of date and should refresh.
       */
      stale?: boolean;
    };

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
 *
 * After a successful submission the student earns XP: SUBMIT (+ ON_TIME before
 * the due date) the first time, RESUBMIT after a send-back. XP is engagement
 * only and never affects the grade; a failure to award it never fails the
 * submission.
 */
export async function submitPaper(assignmentId: string, formData: FormData): Promise<SubmitPaperResult> {
  let xpAwarded = 0;
  let onTime = false;
  try {
    const student = await requireStudent();

    const id = idSchema.safeParse(assignmentId);
    if (!id.success) return { ok: false, error: "Assignment not found." };
    const assignment = await getEnrolledAssignment(student.id, id.data);
    if (parseAssignmentKind(assignment.kind) === "TEST") {
      return { ok: false, error: "This is a paper test. Your teacher scans it after class." };
    }

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

    // Check the paper itself first, so every rejection after this point is a
    // state conflict (and marked stale) rather than a problem with the text.
    const problem = validatePaperText(normalizePaperText(content));
    if (problem) return { ok: false, error: problem };

    const existing = await db.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
      select: { status: true },
    });
    if (existing && existing.status !== "RETURNED") {
      return {
        ok: false,
        stale: true,
        error:
          existing.status === "PUBLISHED"
            ? "This paper already has a published grade."
            : // Covers a paper the teacher added too (sample papers, a scan).
              "Your teacher already has a paper from you for this assignment and is reviewing it.",
      };
    }

    const result = await upsertSubmission({
      assignmentId: assignment.id,
      studentId: student.id,
      content,
      fileName,
      replaceable: STUDENT_REPLACEABLE_STATUSES,
    });
    // The text was validated above, so any failure here is a state conflict:
    // graded, published, already with the teacher, or changed a moment ago.
    if (!result.ok) return { ok: false, error: result.error, stale: true };

    try {
      const xp = await awardSubmissionXp({
        studentId: student.id,
        submissionId: result.submissionId,
        resubmission: existing?.status === "RETURNED",
        dueDate: assignment.dueDate,
        timeZone: await viewerTimeZone(),
      });
      xpAwarded = xp.total;
      onTime = xp.awards.some((award) => award.kind === "ON_TIME");
    } catch (error) {
      // The paper is in; XP is a bonus. Log the error type only.
      console.error("[gradesmart] Submission XP failed", {
        type: error instanceof Error ? error.name : typeof error,
      });
    }
  } catch (error) {
    if (error instanceof AuthError) return { ok: false, error: error.message };
    // Never log the paper itself: it is student data.
    console.error("[gradesmart] Student submission failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return { ok: false, error: "Your paper could not be submitted. Try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true, xpAwarded, onTime };
}

export type LogStudySessionResult = { ok: true; xpAwarded: number } | { ok: false; error: string };

/**
 * Log a study session for one of the student's assignments from the inbox.
 * Earns STUDY_SESSION XP at most once per day (later calls return 0), which
 * also keeps the study streak alive. Engagement only: never part of a grade.
 */
export async function logStudySession(assignmentId: string): Promise<LogStudySessionResult> {
  let xpAwarded = 0;
  try {
    const student = await requireStudent();
    const id = idSchema.safeParse(assignmentId);
    if (!id.success) return { ok: false, error: "Assignment not found." };
    const assignment = await getEnrolledAssignment(student.id, id.data);

    xpAwarded = await transaction((tx) =>
      awardXp(tx, {
        studentId: student.id,
        kind: "STUDY_SESSION",
        xp: XP_RULES.STUDY_SESSION,
        refId: assignment.id,
      })
    );
  } catch (error) {
    if (error instanceof AuthError) return { ok: false, error: error.message };
    console.error("[gradesmart] Study session log failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return { ok: false, error: "Your study session could not be logged. Try again." };
  }

  if (xpAwarded > 0) revalidatePath("/", "layout");
  return { ok: true, xpAwarded };
}
