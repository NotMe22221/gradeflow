import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { AuthError, requireTeacher } from "@/lib/auth/session";
import { GradingConflictError, GradingError, runAiFirstPass } from "@/lib/grading/run";
import { idSchema } from "@/lib/validation/id";

export const dynamic = "force-dynamic";

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * Run the AI first pass for one submission. Teacher only, and only for
 * submissions in the teacher's own classes. The result lands in the review
 * queue; nothing is published from here.
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
    // The submission may now be GRADING_FAILED, so refresh the sidebar counts.
    revalidatePath("/", "layout");
    if (error instanceof GradingError) return errorResponse(error.message, error.status);
    console.error("[markwise] Grade route failed", { type: error instanceof Error ? error.name : typeof error });
    return errorResponse("Grading failed. Try again.", 500);
  }
}
