import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { aiLimitResponse } from "@/lib/ai/guard";
import { AiLimitError } from "@/lib/ai/usage";
import { AuthError, requireStudent } from "@/lib/auth/session";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";
import { MAX_GOAL_CHARS } from "@/lib/goals/parse";
import { GoalPlannerError, planStudentGoal } from "@/lib/goals/planner";
import type { GoalPlannerFailure, GoalPlannerSuccess } from "@/lib/goals/types";
import { stripNul } from "@/lib/text/sanitize";
import { readJsonWithLimit } from "@/lib/http/body";
import { idSchema } from "@/lib/validation/id";

export const dynamic = "force-dynamic";
// One text-model call within the text budget (OPENAI_BUDGETS.text or
// CLAUDE_TASK_BUDGETS.text, 65 s), plus the database work.
export const maxDuration = 90;

/** The goal is at most 300 characters; 4 KB leaves room for JSON escaping. */
const MAX_BODY_BYTES = 4 * 1024;

const NO_STORE = { "Cache-Control": "no-store" };

const bodySchema = z.object({
  goal: z
    .string({ error: "Type your goal first." })
    .transform(stripNul)
    .pipe(
      z
        .string()
        .trim()
        .min(1, "Type your goal first.")
        .max(MAX_GOAL_CHARS, `Keep your goal under ${MAX_GOAL_CHARS} characters.`)
    ),
  classId: idSchema.optional().nullable(),
});

function errorResponse(error: string, status: number, code?: GoalPlannerFailure["code"]) {
  return NextResponse.json<GoalPlannerFailure>(code ? { ok: false, error, code } : { ok: false, error }, {
    status,
    headers: NO_STORE,
  });
}

/**
 * Plan a grade goal for the signed-in student.
 *
 * The goal text is untrusted. With an API key, the text model (gpt-4o-mini
 * or Claude, see engineFor) only reads which class and target it names;
 * without a key, the demo parser does. The
 * required scores are always computed in code (src/lib/goals/plan.ts) from
 * this student's own teacher-approved grades. Saves the goal (one per class)
 * and awards GOAL_SET XP once per day.
 *
 * The body is read with a hard byte cap (a chunked request can't stream an
 * unbounded body into memory). A live planner call goes through the usage
 * caps (lib/ai/guard.ts): past one, 429 with Retry-After, or 503 when waiting
 * won't help (kill switch, a call larger than the daily budget). The demo
 * parser costs nothing and is not limited.
 */
export async function POST(request: Request) {
  try {
    const student = await requireStudent();

    const body = await readJsonWithLimit(request, MAX_BODY_BYTES);
    if (!body.ok) {
      return body.reason === "too_large"
        ? errorResponse(`Keep your goal under ${MAX_GOAL_CHARS} characters.`, 413)
        : errorResponse("Type your goal first.", 400);
    }
    const parsed = bodySchema.safeParse(body.value);
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
        timeZone: await viewerTimeZone(),
      });
    } catch (error) {
      // Expected failures (unclear goal, no class, provider errors) carry a safe message.
      if (error instanceof GoalPlannerError) return errorResponse(error.message, error.status, error.code);
      throw error;
    }

    revalidatePath("/", "layout");
    return NextResponse.json<GoalPlannerSuccess>(result, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof AiLimitError) return aiLimitResponse(error, NO_STORE);
    // Log the error type only: never the key, request headers, or the goal text.
    console.error("[markwise] Goal planner route failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return errorResponse("Your goal could not be planned. Try again.", 500);
  }
}
