import { NextResponse } from "next/server";

import { getOwnedSubmission } from "@/lib/access";
import { AuthError, getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { SCAN_IMAGE_TYPES, type ScanImageType } from "@/lib/scan/images";
import { idSchema } from "@/lib/validation/id";

export const dynamic = "force-dynamic";

function notFound() {
  return NextResponse.json({ ok: false, error: "Photo not found." }, { status: 404 });
}

/**
 * A stored photo of a scanned test. The teacher who owns the class can always
 * see it. The student who owns the submission sees it only once the teacher
 * has published the grade, together with the rest of the graded paper, so a
 * scan filed under the wrong student never reaches anyone before review.
 * Anything else is a 404, so the response never confirms that a photo exists.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string; imageId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });

    const { submissionId: rawSubmissionId, imageId: rawImageId } = await params;
    const submissionId = idSchema.safeParse(rawSubmissionId);
    const imageId = idSchema.safeParse(rawImageId);
    if (!submissionId.success || !imageId.success) return notFound();

    if (user.role === "TEACHER") {
      // Throws a 404 AuthError unless the submission is in one of this teacher's classes.
      await getOwnedSubmission(user.id, submissionId.data);
    } else {
      const own = await db.submission.findFirst({
        where: { id: submissionId.data, studentId: user.id, publishedGrade: { isNot: null } },
        select: { id: true },
      });
      if (!own) return notFound();
    }

    const image = await db.submissionImage.findFirst({
      where: { id: imageId.data, submissionId: submissionId.data },
      select: { mimeType: true, data: true },
    });
    if (!image || !(SCAN_IMAGE_TYPES as readonly string[]).includes(image.mimeType)) return notFound();

    return new Response(new Uint8Array(image.data), {
      status: 200,
      headers: {
        "Content-Type": image.mimeType as ScanImageType,
        "Content-Length": String(image.data.byteLength),
        "Content-Disposition": "inline",
        // Never served from the browser cache: every view re-checks the session,
        // so a photo can't outlive a sign-out or a switch to a student.
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return error.status === 404 ? notFound() : NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("[markwise] Photo route failed", { type: error instanceof Error ? error.name : typeof error });
    return NextResponse.json({ ok: false, error: "Couldn't load that photo." }, { status: 500 });
  }
}
