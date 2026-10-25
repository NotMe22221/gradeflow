import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireStudent } from "@/lib/auth/session";
import { MAX_GOAL_CHARS } from "@/lib/goals/parse";
import { GoalPlannerError, planStudentGoal } from "@/lib/goals/planner";
import type { GoalPlannerFailure, GoalPlannerSuccess } from "@/lib/goals/types";
import { idSchema } from "@/lib/validation/id";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4 * 1024;

const NO_STORE = { "Cache-Control": "no-store" };

const bodySchema = z.object({
  goal: z
    .string({ error: "Type your goal first." })
    .trim()
    .min(1, "Type your goal first.")
    .max(MAX_GOAL_CHARS, `Keep your goal under ${MAX_GOAL_CHARS} characters.`),
  classId: idSchema.optional().nullable(),
});

function errorResponse(error: string, status: number, code?: GoalPlannerFailure["code"]) {
  return NextResponse.json<GoalPlannerFailure>(
    code ? { ok: false, error, code } : { ok: false, error },
    { status, headers: NO_STORE }
  );
}

/**
 * Plan a grade goal for the signed-in student.
 *
 * The goal text is untrusted. With OPENAI_API_KEY, gpt-4o-mini only reads
 * which class and target it names; without a key, the demo parser does. The
 * required scores are always computed in code (src/lib/goals/plan.ts) from
 * this student's own teacher-approved grades. Saves the goal (one per class)
 * and awards GOAL_SET XP once per day.
 */
export async function POST(request: Request) {
  try {
    const student = await requireStudent();

    const declared = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      return errorResponse("That goal is too long.", 413);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Type your goal first.", 400);
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      if (issue?.path[0] === "classId") return errorResponse("Class not found.", 404);
      return errorResponse(issue?.message ?? "Type your goal first.", 400);
    }

    let result: GoalPlannerSuccess;
    try {
      result = await planStudentGoal({
        studentId: student.id,
        goal: parsed.data.goal,
        classId: parsed.data.classId ?? null,
      });
    } catch (error) {
      // Expected failures (unclear goal, no class, OpenAI errors) carry a safe message.
      if (error instanceof GoalPlannerError) return errorResponse(error.message, error.status, error.code);
      throw error;
    }

    revalidatePath("/", "layout");
    return NextResponse.json<GoalPlannerSuccess>(result, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    // Log the error type only: never the key, request headers, or the goal text.
    console.error("[gradesmart] Goal planner route failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return errorResponse("Your goal could not be planned. Try again.", 500);
  }
}
