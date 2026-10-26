import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { loadAssignmentKinds } from "@/components/gradebook/assignment-kinds";
import type { ExportFormatOption } from "@/components/gradebook/export-button";
import { GradesView } from "@/components/gradebook/grades-view";
import { PageContainer } from "@/components/page-header";
import { getOwnedClass } from "@/lib/access";
import { AuthError, requireTeacherPage } from "@/lib/auth/session";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";
import { listExporters } from "@/lib/export";
import { getGradebook } from "@/lib/gradebook/query";

type Params = Promise<{ classId: string }>;

/** The teacher's own class, or null. Cached so metadata and page share one lookup. */
const loadOwnedClass = cache(async (classId: string) => {
  const teacher = await requireTeacherPage();
  if (classId.length > 64) return null;
  try {
    return { teacher, klass: await getOwnedClass(teacher.id, classId) };
  } catch (error) {
    if (error instanceof AuthError) return null;
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const owned = await loadOwnedClass((await params).classId);
  return { title: owned ? `Grades · ${owned.klass.name}` : "Grades" };
}

/** One export button per registered exporter (CSV today, an LMS exporter later). */
function exportFormats(): ExportFormatOption[] {
  return listExporters().map(({ id, label, description }) => ({ id, label, description }));
}

/**
 * The class Grades tab: Google Classroom's spreadsheet of students by
 * assignments. Only teacher-approved grades show a score; AI drafts appear
 * as "Needs review" and link to the review queue.
 */
export default async function ClassGradesPage({ params }: { params: Params }) {
  const owned = await loadOwnedClass((await params).classId);
  if (!owned) notFound();

  // getGradebook re-checks ownership and reads scores from PublishedGrade only.
  const data = await getGradebook(owned.teacher.id, owned.klass.id);
  const [kinds, timeZone] = await Promise.all([loadAssignmentKinds(data), viewerTimeZone()]);

  return (
    <PageContainer>
      {/* The tab bar's class name is a link, not a heading, so the page title is for screen readers. */}
      <h1 className="sr-only">Grades · {owned.klass.name}</h1>
      <GradesView data={data} kinds={kinds} formats={exportFormats()} timeZone={timeZone} />
    </PageContainer>
  );
}
