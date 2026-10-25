"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { AddSubmissionResult, LoadSamplesResult } from "@/components/assignments/types";
import { getOwnedAssignment } from "@/lib/access";
import { AuthError, requireTeacher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { pickSampleSet } from "@/lib/demo/sample-papers";
import { MAX_PAPER_CHARS, readTxtUpload, upsertSubmission } from "@/lib/submissions";

const IdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);

const AddSubmissionSchema = z.object({
  studentId: IdSchema,
  mode: z.enum(["paste", "upload"]),
  // Generous ceiling before normalization; upsertSubmission enforces the real limit.
  content: z.string().max(MAX_PAPER_CHARS * 2),
});

/** How many synthetic papers one click adds. */
const SAMPLE_BATCH_SIZE = 4;

function failure(error: unknown, fallback: string): { ok: false; error: string } {
  if (error instanceof AuthError) return { ok: false, error: error.message };
  console.error("[gradeflow] Assignment action failed", { type: error instanceof Error ? error.name : typeof error });
  return { ok: false, error: fallback };
}

/** Add (or replace) a paper on behalf of an enrolled student. */
export async function addSubmission(assignmentId: string, formData: FormData): Promise<AddSubmissionResult> {
  try {
    const teacher = await requireTeacher();
    const id = IdSchema.safeParse(assignmentId);
    if (!id.success) return { ok: false, error: "Assignment not found." };
    const assignment = await getOwnedAssignment(teacher.id, id.data);

    const studentId = formData.get("studentId");
    const content = formData.get("content");
    const parsed = AddSubmissionSchema.safeParse({
      studentId: typeof studentId === "string" ? studentId : "",
      mode: formData.get("mode"),
      content: typeof content === "string" ? content : "",
    });
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      if (field === "studentId") return { ok: false, error: "Choose a student.", field: "studentId" };
      if (field === "content") {
        return { ok: false, error: `Papers are limited to ${MAX_PAPER_CHARS.toLocaleString("en-US")} characters.`, field: "content" };
      }
      return { ok: false, error: "Paste the paper or upload a .txt file." };
    }

    // The student must be enrolled in this assignment's class.
    const enrollment = await db.enrollment.findUnique({
      where: { classId_studentId: { classId: assignment.classId, studentId: parsed.data.studentId } },
      select: { student: { select: { id: true, name: true, role: true } } },
    });
    if (!enrollment || enrollment.student.role !== "STUDENT") {
      return { ok: false, error: "That student is not enrolled in this class.", field: "studentId" };
    }

    let text = parsed.data.content;
    let fileName: string | null = null;
    if (parsed.data.mode === "upload") {
      const file = formData.get("file");
      const upload = await readTxtUpload(file instanceof File ? file : null);
      if (!upload) return { ok: false, error: "Choose a .txt file to upload.", field: "file" };
      if ("error" in upload) return { ok: false, error: upload.error, field: "file" };
      text = upload.text;
      fileName = upload.fileName.slice(0, 200);
    }

    // Stored verbatim as untrusted data; it is never interpreted as instructions.
    const result = await upsertSubmission({
      assignmentId: assignment.id,
      studentId: enrollment.student.id,
      content: text,
      fileName,
    });
    if (!result.ok) {
      return { ok: false, error: result.error, field: parsed.data.mode === "upload" ? "file" : "content" };
    }

    revalidatePath("/", "layout");
    return { ok: true, studentName: enrollment.student.name };
  } catch (error) {
    return failure(error, "The paper could not be added. Try again.");
  }
}

/**
 * Demo helper: add synthetic papers for enrolled students who have not
 * submitted yet, so the AI pass has something to grade. The set is chosen
 * from the assignment title (persuasive, lab, or literary).
 */
export async function loadSamplePapers(assignmentId: string): Promise<LoadSamplesResult> {
  try {
    const teacher = await requireTeacher();
    const id = IdSchema.safeParse(assignmentId);
    if (!id.success) return { ok: false, error: "Assignment not found." };
    const assignment = await getOwnedAssignment(teacher.id, id.data);

    const waiting = await db.enrollment.findMany({
      where: {
        classId: assignment.classId,
        student: { role: "STUDENT", submissions: { none: { assignmentId: assignment.id } } },
      },
      select: { studentId: true },
      orderBy: { student: { name: "asc" } },
      take: SAMPLE_BATCH_SIZE,
    });
    if (waiting.length === 0) {
      const enrolled = await db.enrollment.count({ where: { classId: assignment.classId } });
      return {
        ok: false,
        error: enrolled === 0 ? "Add students to this class first." : "Every enrolled student already has a paper.",
      };
    }

    const papers = pickSampleSet(assignment.title);
    let count = 0;
    for (const [index, { studentId }] of waiting.entries()) {
      const sample = papers[index % papers.length];
      const result = await upsertSubmission({
        assignmentId: assignment.id,
        studentId,
        content: sample.content,
        fileName: null,
      });
      if (result.ok) count++;
    }
    if (count === 0) return { ok: false, error: "No sample papers could be added. Try again." };

    revalidatePath("/", "layout");
    return { ok: true, count };
  } catch (error) {
    return failure(error, "The sample papers could not be added. Try again.");
  }
}
