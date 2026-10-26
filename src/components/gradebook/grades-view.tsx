import Link from "next/link";
import { FilePlus2, Plus, UserPlus } from "@/components/icons";

import { EmptyState } from "@/components/empty-state";
import { ExportButtons, type ExportFormatOption } from "@/components/gradebook/export-button";
import { GradebookLegend } from "@/components/gradebook/gradebook-legend";
import { GradebookTable } from "@/components/gradebook/gradebook-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AssignmentKind } from "@/lib/constants";
import { pluralize } from "@/lib/format";
import type { GradebookData } from "@/lib/gradebook/types";
import { cn } from "@/lib/utils";

/** "6 students · 4 assignments · 8 of 24 graded · 2 need review" */
export function summarizeGrades(data: GradebookData): string {
  const cells = data.rows.flatMap((row) => row.cells);
  const graded = cells.filter((cell) => cell.state === "published").length;
  const inReview = cells.filter((cell) => cell.state === "in_review").length;
  const parts = [pluralize(data.rows.length, "student"), pluralize(data.assignments.length, "assignment")];
  if (cells.length > 0) parts.push(`${graded} of ${cells.length} graded`);
  if (inReview > 0) parts.push(`${inReview} need${inReview === 1 ? "s" : ""} review`);
  return parts.join(" · ");
}

function GradesBody({
  data,
  kinds,
  timeZone,
}: {
  data: GradebookData;
  kinds: Record<string, AssignmentKind>;
  timeZone?: string;
}) {
  const classHref = `/classes/${encodeURIComponent(data.class.id)}`;

  if (data.assignments.length === 0) {
    return (
      <EmptyState
        icon={FilePlus2}
        title="Add an assignment to start filling Grades."
        description="Each assignment becomes a column. Grades appear here once you approve them."
        className="rounded-none border-0 bg-transparent py-16"
        action={
          <Button asChild>
            <Link href={`${classHref}/assignments/new`}>
              <Plus aria-hidden />
              New assignment
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
        title="Add students to this class to fill Grades."
        description="Each student gets a row as soon as they join the class."
        className="rounded-none border-0 bg-transparent py-16"
        action={
          <Button asChild variant="outline">
            <Link href={`${classHref}/people`}>Go to People</Link>
          </Button>
        }
      />
    );
  }

  return <GradebookTable data={data} kinds={kinds} timeZone={timeZone} />;
}

/**
 * A class's Grades: a toolbar with the summary and the export, the
 * spreadsheet, and the legend. Shared by the class Grades tab and the
 * cross-class Gradebook. Scores come only from approved (published) grades.
 */
export function GradesView({
  data,
  kinds,
  formats,
  header,
  timeZone,
  className,
}: {
  data: GradebookData;
  kinds: Record<string, AssignmentKind>;
  /** Registered exporters (CSV today, an LMS exporter later). */
  formats: readonly ExportFormatOption[];
  /** Optional heading row inside the card (the cross-class Gradebook names the class). */
  header?: React.ReactNode;
  /** The viewer's time zone (viewerTimeZone()) for the Missing cells; undefined uses the server's. */
  timeZone?: string;
  className?: string;
}) {
  const classTitle = [data.class.name, data.class.section].filter(Boolean).join(" · ");
  const hasTable = data.assignments.length > 0 && data.rows.length > 0;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="tabular pt-2.5 text-sm text-muted-foreground">{summarizeGrades(data)}</p>
        <ExportButtons classId={data.class.id} classTitle={classTitle} formats={formats} />
      </div>
      <Card className="overflow-hidden">
        {header}
        <GradesBody data={data} kinds={kinds} timeZone={timeZone} />
      </Card>
      {hasTable ? <GradebookLegend className="mt-4 px-1" /> : null}
    </div>
  );
}
