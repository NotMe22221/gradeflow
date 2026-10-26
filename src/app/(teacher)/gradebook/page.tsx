import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { ClassAvatar } from "@/components/classroom/class-avatar";
import { EmptyState } from "@/components/empty-state";
import { loadAssignmentKinds } from "@/components/gradebook/assignment-kinds";
import { ClassChips } from "@/components/classroom/class-chips";
import type { ExportFormatOption } from "@/components/gradebook/export-button";
import { GradesView } from "@/components/gradebook/grades-view";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireTeacherPage } from "@/lib/auth/session";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";
import { listExporters } from "@/lib/export";
import { getGradebook, listGradebookClasses } from "@/lib/gradebook/query";

export const metadata: Metadata = { title: "Gradebook" };

const TITLE = "Gradebook";
const DESCRIPTION = "Grades for every class you teach. Only grades you approve appear here.";

/** One export button per registered exporter (CSV today, an LMS exporter later). */
function exportFormats(): ExportFormatOption[] {
  return listExporters().map(({ id, label, description }) => ({ id, label, description }));
}

function single(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first && first.length <= 64 ? first : null;
}

/**
 * The cross-class gradebook from the drawer: pick a class with the chips,
 * then the same Grades grid as the class's Grades tab.
 */
export default async function GradebookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const teacher = await requireTeacherPage();
  const requestedClassId = single((await searchParams).class);

  const classes = await listGradebookClasses(teacher.id);
  // Only ever open a class the teacher owns; an unknown ?class= falls back to the first.
  const selected = classes.find((klass) => klass.id === requestedClassId) ?? classes[0] ?? null;

  if (!selected) {
    return (
      <PageContainer>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <EmptyState
          icon={BookOpen}
          title="Create a class to start a gradebook."
          description="Approved grades for every student and assignment collect here."
          action={
            <Button asChild>
              <Link href="/classes">
                Go to classes
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const data = await getGradebook(teacher.id, selected.id);
  const [kinds, timeZone] = await Promise.all([loadAssignmentKinds(data), viewerTimeZone()]);
  const gradesHref = `/classes/${encodeURIComponent(data.class.id)}/grades`;

  return (
    <PageContainer>
      <PageHeader title={TITLE} description={DESCRIPTION} />

      <ClassChips classes={classes} selectedId={selected.id} basePath="/gradebook" className="mb-6" />

      <GradesView
        data={data}
        kinds={kinds}
        formats={exportFormats()}
        timeZone={timeZone}
        header={
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
            <ClassAvatar name={data.class.name} className="size-10 text-base" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold text-foreground">{data.class.name}</h2>
              {data.class.section ? <p className="truncate text-[13px] text-muted-foreground">{data.class.section}</p> : null}
            </div>
            <Button asChild variant="text" size="sm">
              <Link href={gradesHref}>
                Open class Grades
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        }
      />
    </PageContainer>
  );
}
