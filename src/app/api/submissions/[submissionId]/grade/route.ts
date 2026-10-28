import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { aiLimitResponse } from "@/lib/ai/guard";
import { AiLimitError } from "@/lib/ai/usage";
import { AuthError, requireTeacher } from "@/lib/auth/session";
import { GradingConflictError, GradingError, runAiFirstPass } from "@/lib/grading/run";
import { idSchema } from "@/lib/validation/id";

export const dynamic = "force-dynamic";
// One Claude call, capped at 110 seconds with its retry (CLAUDE_REQUEST_BUDGET
// in lib/grading/claude-grader.ts), plus the database work.
export const maxDuration = 120;

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * Run the AI first pass for one submission. Teacher only, and only for
 * submissions in the teacher's own classes. The result lands in the review
 * queue; nothing is published from here. A live call that a usage cap stops
 * answers with the reason, 429 with Retry-After, or 503 when waiting won't
 * help (kill switch, a call larger than the daily budget), and the paper is
 * left as it was.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  try {
    const user = await requireTeacher();
    const parsed = idSchema.safeParse((await params).submissionId);
    if (!parsed.success) return errorResponse("Submission not found.", 404);

    const submission = await runAiFirstPass(user.id, parsed.data);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, submission });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof GradingConflictError) return errorResponse(error.message, 409);
    if (error instanceof AiLimitError) return aiLimitResponse(error);
    // The submission may now be GRADING_FAILED, so refresh the sidebar counts.
    revalidatePath("/", "layout");
    if (error instanceof GradingError) return errorResponse(error.message, error.status);
    console.error("[markwise] Grade route failed", { type: error instanceof Error ? error.name : typeof error });
    return errorResponse("Grading failed. Try again.", 500);
  }
}
