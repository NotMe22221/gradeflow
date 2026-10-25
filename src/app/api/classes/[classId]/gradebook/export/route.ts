import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireTeacher } from "@/lib/auth/session";
import { DEFAULT_EXPORT_FORMAT, getExporter, listExporters } from "@/lib/export";
import { getGradebook } from "@/lib/gradebook/query";
import { idSchema } from "@/lib/validation/id";

export const dynamic = "force-dynamic";

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

    const classId = idSchema.safeParse((await params).classId);
    if (!classId.success) return errorResponse("Class not found.", 404);

    const requestedFormat = new URL(request.url).searchParams.get("format");
    const format = FormatSchema.safeParse(requestedFormat ?? DEFAULT_EXPORT_FORMAT);
    const exporter = format.success ? getExporter(format.data) : null;
    if (!exporter) {
      const supported = listExporters()
        .map((candidate) => candidate.id)
        .join(", ");
      return errorResponse(`That export format is not supported. Supported formats: ${supported}.`, 400);
    }

    const gradebook = await getGradebook(teacher.id, classId.data);
    // Exporters may be async (an LMS push); a plain CSV build resolves at once.
    const { filename, body } = await exporter.export(gradebook);

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
    console.error("[gradesmart] Gradebook export failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return errorResponse("The export failed. Try again.", 500);
  }
}
