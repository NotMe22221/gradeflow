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
 */
export function ClassCard({ summary, className }: { summary: ClassSummary; className?: string }) {
  const href = `/classes/${encodeURIComponent(summary.id)}`;
  const meta = [summary.section, summary.subject].filter(Boolean).join(" · ");
  const hasPending = summary.pendingReview > 0;

  return (
    <Card
      className={cn(
        "relative h-full transition-[box-shadow,border-color] hover:border-foreground/15 hover:shadow-raised",
        className
      )}
    >
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
              <Link
                href={href}
                className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:after:ring-[3px] focus-visible:after:ring-ring"
              >
                {summary.name}
              </Link>
            </h3>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{meta || "No section or subject"}</p>
          </div>
          {hasPending ? (
            <Badge className="tabular h-7 shrink-0 px-2.5 text-[13px] font-semibold">
              {summary.pendingReview} to review
            </Badge>
          ) : (
            <span className="inline-flex h-7 shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="size-3.5" aria-hidden />
              Nothing to review
            </span>
          )}
        </div>

        <dl className="grid grid-cols-3 gap-4">
          <Metric label="Students" value={summary.studentCount} />
          <Metric label="Assignments" value={summary.assignmentCount} />
          <Metric label="Published" value={summary.publishedCount} />
        </dl>

        <ul className="mt-auto space-y-2 text-sm text-muted-foreground">
          {summary.readyForAi > 0 ? (
            <li className="flex items-center gap-2">
              <Sparkles className="size-4 shrink-0" aria-hidden />
              <span className="tabular truncate">{summary.readyForAi} ready for AI pass</span>
            </li>
          ) : null}
          <li className="flex min-w-0 items-center gap-2">
            <CalendarClock className="size-4 shrink-0" aria-hidden />
            {summary.nextDue ? (
              <span className="min-w-0 truncate">
                Next due:{" "}
                <span className="font-medium text-foreground">{summary.nextDue.title}</span>
                {" · "}
                {formatDate(summary.nextDue.dueDate)}
              </span>
            ) : (
              <span className="truncate">No upcoming due dates</span>
            )}
          </li>
        </ul>
      </div>

      <CardFooter className="relative z-10 justify-between gap-2 px-4 py-3">
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
