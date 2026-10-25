import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { formatDate, pluralize } from "@/lib/format";
import type { ClassSummary } from "@/lib/stats";
import { cn } from "@/lib/utils";

function reviewHref(summary: ClassSummary): string {
  const [only, ...rest] = summary.pendingAssignmentIds;
  return only && rest.length === 0 ? `/review?assignment=${encodeURIComponent(only)}` : "/review";
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular mt-0.5 text-base font-semibold text-foreground">{value}</dd>
    </div>
  );
}

/**
 * One class on the dashboard. The whole card links to the class page via a
 * stretched title link; footer actions sit above it.
 *
 * Long names, meta, and due titles wrap (clamped to two lines) instead of
 * truncating, and the review badge only takes space next to the title when
 * there is something to review.
 */
export function DashboardClassCard({ summary, className }: { summary: ClassSummary; className?: string }) {
  const href = `/classes/${encodeURIComponent(summary.id)}`;
  const meta = [summary.section, summary.subject].filter(Boolean).join(" · ") || "No section or subject";
  const hasPending = summary.pendingReview > 0;
  const nextDue = summary.nextDue;

  return (
    <Card
      className={cn(
        "relative h-full transition-[box-shadow,border-color] hover:border-foreground/15 hover:shadow-raised",
        className
      )}
    >
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <h3 className="line-clamp-2 min-w-0 text-base font-semibold tracking-tight break-words text-pretty text-foreground">
              <Link
                href={href}
                className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:after:ring-[3px] focus-visible:after:ring-ring"
              >
                {summary.name}
              </Link>
            </h3>
            {hasPending ? (
              // -my-0.5 keeps the 28px badge inside the 24px title line, so cards with and
              // without a badge line up row for row.
              <Badge variant="warning" className="tabular -my-0.5 h-7 shrink-0 px-2.5 text-[13px] font-semibold">
                {summary.pendingReview} to review
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm break-words text-muted-foreground">{meta}</p>
        </div>

        <dl className="grid grid-cols-3 gap-4">
          <Metric label="Students" value={summary.studentCount} />
          <Metric label="Assignments" value={summary.assignmentCount} />
          <Metric label="Published" value={summary.publishedCount} />
        </dl>

        <ul className="mt-auto space-y-2 text-sm text-muted-foreground">
          {hasPending ? null : (
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0">Nothing to review</span>
            </li>
          )}
          {summary.readyForAi > 0 ? (
            <li className="flex items-center gap-2">
              <Sparkles className="size-4 shrink-0" aria-hidden />
              <span className="tabular min-w-0">{summary.readyForAi} ready for AI pass</span>
            </li>
          ) : null}
          <li className="flex items-start gap-2">
            <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden />
            {nextDue ? (
              // Date first, so a long title can never clamp it away.
              <span className="line-clamp-2 min-w-0 break-words">
                Next due <time dateTime={nextDue.dueDate.toISOString()}>{formatDate(nextDue.dueDate)}</time>
                {" · "}
                <span className="font-medium text-foreground">{nextDue.title}</span>
              </span>
            ) : (
              <span className="min-w-0">No upcoming due dates</span>
            )}
          </li>
        </ul>
      </div>

      <CardFooter className="relative z-10 flex-wrap justify-between gap-2 px-4 py-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={href}>Open class</Link>
        </Button>
        {hasPending ? (
          <Button asChild variant="outline" size="sm">
            <Link href={reviewHref(summary)} aria-label={`Review ${pluralize(summary.pendingReview, "paper")} in ${summary.name}`}>
              Review
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
