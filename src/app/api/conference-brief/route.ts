import { NextResponse } from "next/server";
import { z } from "zod";

import { describeOpenAiError, openAiConfigured } from "@/lib/ai/openai";
import { AuthError, requireTeacher } from "@/lib/auth/session";
import { BriefError, generateConferenceBrief } from "@/lib/briefs/generate";
import { buildBriefInput } from "@/lib/briefs/input";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";
import type { ConferenceBriefFailure, ConferenceBriefSuccess } from "@/lib/briefs/types";
import { readJsonWithLimit } from "@/lib/http/body";
import { AI_RATE_LIMITS, checkRateLimit, rateLimitMessage } from "@/lib/http/rate-limit";
import { buildStudentProfile } from "@/lib/insights/profile";
import { getStudentRecord } from "@/lib/insights/student";
import { idSchema } from "@/lib/validation/id";

// Longer than the text task's hard deadline in src/lib/ai/openai.ts.
export const maxDuration = 90;

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4 * 1024;

const bodySchema = z.object({ classId: idSchema, studentId: idSchema });

const NO_STORE = { "Cache-Control": "no-store" };

function errorResponse(error: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json<ConferenceBriefFailure>({ ok: false, error }, { status, headers: { ...NO_STORE, ...headers } });
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
 *
 * The body is read with a hard byte cap, so a chunked request can't stream an
 * unbounded body into memory. With a live key, each teacher gets a limited
 * number of drafts per window (429 with Retry-After past it); the demo brief
 * costs nothing and is not limited.
 */
export async function POST(request: Request) {
  try {
    const teacher = await requireTeacher();

    const body = await readJsonWithLimit(request, MAX_BODY_BYTES);
    if (!body.ok) {
      return body.reason === "too_large"
        ? errorResponse("That request is too large.", 413)
        : errorResponse("Send a class and a student.", 400);
    }
    const parsed = bodySchema.safeParse(body.value);
    if (!parsed.success) return errorResponse("Student not found.", 404);

    const now = new Date();
    const record = await getStudentRecord(teacher.id, parsed.data.classId, parsed.data.studentId);
    // The same open-work states (upcoming vs missing) as the profile page the teacher is on.
    const input = buildBriefInput(record, now, buildStudentProfile(record, now, await viewerTimeZone()));
    if (input.basis.publishedCount === 0) {
      return errorResponse(
        `Approve a grade for ${input.student.firstName} first. Briefs are drafted from teacher-approved grades only.`,
        422
      );
    }

    // Only a live model call costs money, so only it counts against the limit.
    if (openAiConfigured()) {
      const limited = checkRateLimit(`${teacher.id}:text`, AI_RATE_LIMITS.text);
      if (!limited.ok) {
        return errorResponse(rateLimitMessage(limited.retryAfterSeconds), 429, {
          "Retry-After": String(limited.retryAfterSeconds),
        });
      }
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
    console.error("[markwise] Conference brief route failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return errorResponse("The brief could not be drafted. Try again.", 500);
  }
}
