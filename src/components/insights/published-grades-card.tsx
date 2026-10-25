import Link from "next/link";
import { ArrowUpRight, CircleCheckBig } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { HEAT_TONE } from "@/components/insights/heat-tone";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime, formatScore, pluralize } from "@/lib/format";
import { formatHeatPercent, heatBand } from "@/lib/insights/heatmap";
import type { PublishedGradeSummary } from "@/lib/insights/profile";
import { cn } from "@/lib/utils";

/** The student's published grades in this class, newest first. PublishedGrade only. */
export function PublishedGradesCard({ grades }: { grades: PublishedGradeSummary[] }) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle>
          <h2>Published grades</h2>
        </CardTitle>
        <CardDescription className="tabular">
          {grades.length === 0
            ? "Approved by you. The student sees these too."
            : `${pluralize(grades.length, "grade")} approved by you. The student sees these too.`}
        </CardDescription>
      </CardHeader>

      {grades.length === 0 ? (
        <div className="px-6 pb-6">
          <EmptyState
            icon={CircleCheckBig}
            title="No approved grades yet."
            description="Grades appear here once you approve them in the review queue."
            className="py-10"
          />
        </div>
      ) : (
        <Table className="border-t border-border">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="pr-2 pl-4 sm:pr-4 sm:pl-6">
                Assignment
              </TableHead>
              <TableHead scope="col" className="px-2 text-right sm:px-4">
                Score
              </TableHead>
              <TableHead scope="col" className="px-2 text-right sm:px-4">
                Percent
              </TableHead>
              <TableHead scope="col" className="hidden sm:table-cell">
                Published
              </TableHead>
              <TableHead scope="col" className="pr-4 pl-2 sm:pr-6">
                <span className="sr-only">Open</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grades.map((grade) => (
              <TableRow key={grade.submissionId} className="hover:bg-background">
                <TableCell className="min-w-32 pr-2 pl-4 whitespace-normal sm:min-w-40 sm:pr-4 sm:pl-6">
                  <p className="line-clamp-2 text-sm font-medium break-words text-foreground" title={grade.title}>
                    {grade.title}
                  </p>
                  <p className="text-xs text-muted-foreground sm:hidden">
                    <time dateTime={grade.publishedAt.toISOString()}>{formatDate(grade.publishedAt)}</time>
                  </p>
                </TableCell>
                <TableCell className="tabular px-2 text-right font-medium text-foreground sm:px-4">
                  {formatScore(grade.totalScore, grade.maxScore)}
                </TableCell>
                <TableCell className="px-2 text-right sm:px-4">
                  <span
                    className={cn(
                      "tabular inline-flex h-6 min-w-12 items-center justify-center rounded-md px-1.5 text-xs font-semibold",
                      HEAT_TONE[heatBand(grade.percent)].cell
                    )}
                  >
                    {formatHeatPercent(grade.percent)}
                  </span>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                  <time dateTime={grade.publishedAt.toISOString()} title={formatDateTime(grade.publishedAt)}>
                    {formatDate(grade.publishedAt)}
                  </time>
                </TableCell>
                <TableCell className="pr-4 pl-2 text-right sm:pr-6">
                  <Link
                    href={`/assignments/${encodeURIComponent(grade.assignmentId)}`}
                    aria-label={`Open ${grade.title}`}
                    className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
                  >
                    <ArrowUpRight className="size-4" aria-hidden />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
