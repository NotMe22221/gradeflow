import Link from "next/link";
import { ChevronRight, CircleCheckBig } from "@/components/icons";

import { EmptyState } from "@/components/empty-state";
import { AssignmentIcon } from "@/components/classwork/assignment-icon";
import { HEAT_TONE } from "@/components/insights/heat-tone";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime, formatScore, pluralize } from "@/lib/format";
import { formatHeatPercent, heatBand } from "@/lib/insights/heatmap";
import type { PublishedGradeSummary } from "@/lib/insights/profile";
import { cn } from "@/lib/utils";

/**
 * The student's returned grades in this class, newest first (PublishedGrade
 * only), as Classroom-style rows: the class-colored assignment icon, the
 * title and return date, then the score and percent (the chip uses the
 * heatmap's scale and prints its value). The whole row opens the assignment.
 * Rows tighten with the compact density.
 */
export function PublishedGradesCard({
  grades,
  classColor,
  testAssignmentIds = [],
}: {
  grades: PublishedGradeSummary[];
  /** The class color (classTheme(klass).color) for the row icons. */
  classColor: string;
  /** Assignments that are handwritten paper tests (scan icon instead of a document). */
  testAssignmentIds?: string[];
}) {
  const tests = new Set(testAssignmentIds);

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="gap-1 px-5 pt-5 pb-4 sm:px-6">
        <CardTitle>
          <h2>Returned grades</h2>
        </CardTitle>
        <CardDescription className="tabular">
          {grades.length === 0
            ? "Grades you approve and return. The student sees these too."
            : `${pluralize(grades.length, "grade")} you approved and returned. The student sees these too.`}
        </CardDescription>
      </CardHeader>

      {grades.length === 0 ? (
        <div className="px-5 pb-6 sm:px-6">
          <EmptyState
            icon={CircleCheckBig}
            title="No returned grades yet."
            description="A grade appears here once you choose Approve & return in To review."
            className="border-dashed bg-background py-10"
          />
        </div>
      ) : (
        <ul aria-label="Returned grades" className="divide-y divide-border border-t border-border">
          {grades.map((grade) => (
            <li key={grade.submissionId}>
              <Link
                href={`/assignments/${encodeURIComponent(grade.assignmentId)}`}
                className="group flex min-h-16 items-center gap-3 px-5 py-2.5 transition-colors outline-none hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset compact:min-h-13 compact:py-1.5 sm:gap-4 sm:px-6"
              >
                <AssignmentIcon isTest={tests.has(grade.assignmentId)} color={classColor} className="size-9 [&_svg]:size-[18px]" />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-medium break-words text-foreground" title={grade.title}>
                    {grade.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Returned{" "}
                    <time dateTime={grade.publishedAt.toISOString()} title={formatDateTime(grade.publishedAt)}>
                      {formatDate(grade.publishedAt)}
                    </time>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 sm:gap-3">
                  <span className="tabular text-sm font-medium text-foreground">
                    {formatScore(grade.totalScore, grade.maxScore)}
                  </span>
                  <span
                    className={cn(
                      "tabular inline-flex h-6 min-w-12 items-center justify-center rounded-full px-2 text-xs font-semibold",
                      HEAT_TONE[heatBand(grade.percent)].cell
                    )}
                  >
                    {formatHeatPercent(grade.percent)}
                  </span>
                  <ChevronRight
                    className="hidden size-5 text-muted-foreground/70 transition-colors group-hover:text-foreground sm:block"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
