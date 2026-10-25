import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, FilePlus2, UserPlus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ClassSwitcher } from "@/components/gradebook/class-switcher";
import { ExportCsvButton } from "@/components/gradebook/export-button";
import { GradebookLegend } from "@/components/gradebook/gradebook-legend";
import { GradebookTable } from "@/components/gradebook/gradebook-table";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireTeacherPage } from "@/lib/auth/session";
import { pluralize } from "@/lib/format";
import { getGradebook, listGradebookClasses } from "@/lib/gradebook/query";
import type { GradebookData } from "@/lib/gradebook/types";

export const metadata: Metadata = { title: "Gradebook" };

const TITLE = "Gradebook";
const DESCRIPTION = "Only teacher-approved grades appear here.";

function single(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first && first.length <= 64 ? first : null;
}

function summarize(data: GradebookData): string {
  const cells = data.rows.flatMap((row) => row.cells);
  const published = cells.filter((cell) => cell.state === "published").length;
  const inReview = cells.filter((cell) => cell.state === "in_review").length;
  const parts = [
    pluralize(data.rows.length, "student"),
    pluralize(data.assignments.length, "assignment"),
  ];
  if (cells.length > 0) parts.push(`${published} of ${cells.length} published`);
  if (inReview > 0) parts.push(`${inReview} in review`);
  return parts.join(" · ");
}

function GradebookBody({ data }: { data: GradebookData }) {
  const classHref = `/classes/${encodeURIComponent(data.class.id)}`;

  if (data.assignments.length === 0) {
    return (
      <EmptyState
        icon={FilePlus2}
        title="Add an assignment to start filling this gradebook."
        description="Each assignment becomes a column. Grades appear here once you approve them."
        className="rounded-none border-0 bg-transparent py-16"
        action={
          <Button asChild>
            <Link href={`${classHref}/assignments/new`}>
              New assignment
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />
    );
  }

  if (data.rows.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Add students to this class to fill the gradebook."
        description="Each student gets a row as soon as they join the roster."
        className="rounded-none border-0 bg-transparent py-16"
        action={
          <Button asChild variant="outline">
            <Link href={classHref}>Open class roster</Link>
          </Button>
        }
      />
    );
  }

  return <GradebookTable data={data} />;
}

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
          description="Published grades for every student and assignment collect here."
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
  const classTitle = [data.class.name, data.class.section].filter(Boolean).join(" · ");
  const hasTable = data.assignments.length > 0 && data.rows.length > 0;

  return (
    <PageContainer>
      <PageHeader
        title={TITLE}
        description={DESCRIPTION}
        actions={<ExportCsvButton classId={data.class.id} classTitle={classTitle} />}
      />

      <ClassSwitcher classes={classes} selectedId={selected.id} className="mb-6" />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold tracking-tight text-foreground">{classTitle}</h2>
            <p className="tabular mt-0.5 text-sm text-muted-foreground">{summarize(data)}</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 self-start sm:ml-0 sm:self-center">
            <Link href={`/classes/${encodeURIComponent(data.class.id)}`}>
              Open class
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
        <GradebookBody data={data} />
      </Card>

      {hasTable ? <GradebookLegend className="mt-4 px-1" /> : null}
    </PageContainer>
  );
}
