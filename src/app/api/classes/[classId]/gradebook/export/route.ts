import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireTeacher } from "@/lib/auth/session";
import { DEFAULT_EXPORT_FORMAT, getExporter } from "@/lib/export";
import { getGradebook } from "@/lib/gradebook/query";

export const dynamic = "force-dynamic";

const ClassIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);

const FormatSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9_-]+$/);

function errorResponse(error: string, status: number) {
  return NextResponse.json(
    { ok: false, error },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * Download a class gradebook. Teacher only, and only for the teacher's own
 * classes. The data is published (teacher-approved) grades only: AI
 * suggestions and unpublished drafts never appear in an export.
 */
export async function GET(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  try {
    const teacher = await requireTeacher();

    const classId = ClassIdSchema.safeParse((await params).classId);
    if (!classId.success) return errorResponse("Class not found.", 404);

    const requestedFormat = new URL(request.url).searchParams.get("format");
    const format = FormatSchema.safeParse(requestedFormat ?? DEFAULT_EXPORT_FORMAT);
    const exporter = format.success ? getExporter(format.data) : null;
    if (!exporter) return errorResponse("That export format is not supported. Use format=csv.", 400);

    const gradebook = await getGradebook(teacher.id, classId.data);
    const { filename, body } = exporter.export(gradebook);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": exporter.contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    console.error("[gradeflow] Gradebook export failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return errorResponse("The export failed. Try again.", 500);
  }
}
