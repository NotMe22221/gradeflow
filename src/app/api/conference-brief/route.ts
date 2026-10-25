import { NextResponse } from "next/server";
import { z } from "zod";

import { describeOpenAiError } from "@/lib/ai/openai";
import { AuthError, requireTeacher } from "@/lib/auth/session";
import { BriefError, generateConferenceBrief } from "@/lib/briefs/generate";
import { buildBriefInput } from "@/lib/briefs/input";
import type { ConferenceBriefFailure, ConferenceBriefSuccess } from "@/lib/briefs/types";
import { getStudentRecord } from "@/lib/insights/student";
import { idSchema } from "@/lib/validation/id";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4 * 1024;

const bodySchema = z.object({ classId: idSchema, studentId: idSchema });

const NO_STORE = { "Cache-Control": "no-store" };

function errorResponse(error: string, status: number) {
  return NextResponse.json<ConferenceBriefFailure>({ ok: false, error }, { status, headers: NO_STORE });
}

/**
 * Draft a one-page parent-teacher conference brief for one student in one
 * class the teacher owns. Reads ONLY teacher-approved PublishedGrade data
 * (scores, rubric breakdown, teacher comments and feedback, publish dates),
 * upcoming assignments, and engagement. The brief is a draft for the teacher
 * to review; it is not stored.
 *
 * With OPENAI_API_KEY: the text model (modelFor("text")). Without it: the
 * deterministic demo brief, labelled as such.
 */
export async function POST(request: Request) {
  try {
    const teacher = await requireTeacher();

    const declared = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return errorResponse("That request is too large.", 413);

    let body: unknown;
    try {
      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) return errorResponse("That request is too large.", 413);
      body = JSON.parse(raw);
    } catch {
      return errorResponse("Send a class and a student.", 400);
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return errorResponse("Student not found.", 404);

    const now = new Date();
    const record = await getStudentRecord(teacher.id, parsed.data.classId, parsed.data.studentId);
    const input = buildBriefInput(record, now);
    if (input.basis.publishedCount === 0) {
      return errorResponse(
        `Approve a grade for ${input.student.firstName} first. Briefs are drafted from teacher-approved grades only.`,
        422
      );
    }

    let generated;
    try {
      generated = await generateConferenceBrief(input);
    } catch (error) {
      if (error instanceof BriefError) return errorResponse(error.message, error.status);
      return errorResponse(describeOpenAiError(error, "Conference brief"), 502);
    }

    return NextResponse.json<ConferenceBriefSuccess>(
      {
        ok: true,
        engine: generated.engine,
        model: generated.model,
        generatedAt: now.toISOString(),
        brief: generated.brief,
        basis: input.basis,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    // Log the error type only: never the key, request headers, or student data.
    console.error("[gradesmart] Conference brief route failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return errorResponse("The brief could not be drafted. Try again.", 500);
  }
}
