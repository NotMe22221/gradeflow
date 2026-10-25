"use client";

import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Eye,
  ListChecks,
  LoaderCircle,
  MessageSquareText,
  PenLine,
  Send,
  Target,
  Timer,
} from "lucide-react";

import { dueLabel, statusSummary, type InboxAssignment } from "@/components/student/inbox-model";
import { StudentStateBadge } from "@/components/student/student-state-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPoints, pluralize } from "@/lib/format";

const PREVIEW_LIMIT = 5;

function PrimaryAction({ row, className }: { row: InboxAssignment; className?: string }) {
  const href = `/student/assignments/${row.id}`;
  switch (row.state) {
    case "not_submitted":
      return row.kind === "TEST" ? (
        <Button asChild variant="outline" className={className}>
          <Link href={href}>
            <ClipboardList aria-hidden />
            View test details
          </Link>
        </Button>
      ) : (
        <Button asChild className={className}>
          <Link href={href}>
            <Send aria-hidden />
            Submit paper
          </Link>
        </Button>
      );
    case "returned":
      return row.kind === "TEST" ? (
        <Button asChild className={className}>
          <Link href={href}>
            <MessageSquareText aria-hidden />
            Read your teacher&apos;s note
          </Link>
        </Button>
      ) : (
        <Button asChild className={className}>
          <Link href={href}>
            <PenLine aria-hidden />
            Revise and resubmit
          </Link>
        </Button>
      );
    case "submitted":
      return (
        <Button asChild variant="outline" className={className}>
          <Link href={href}>
            <Eye aria-hidden />
            View submission
          </Link>
        </Button>
      );
    case "graded":
      return (
        <Button asChild className={className}>
          <Link href={href}>
            <MessageSquareText aria-hidden />
            View feedback
          </Link>
        </Button>
      );
  }
}

/**
 * Quick-launch actions for one assignment: open it, plan a grade for its
 * class, log a study session, and preview the rubric. Rubric descriptions are
 * never shown here (a test's descriptions hold the answer key).
 */
export function InboxPanel({
  row,
  showHeading = true,
  onPlan,
  onLogStudy,
  studyPending,
  studyLoggedToday,
  headingRef,
}: {
  row: InboxAssignment;
  /** False inside the phone sheet, which shows the title in its own header. */
  showHeading?: boolean;
  /** Absent when the goal planner is not on the page. */
  onPlan?: (classId: string) => void;
  onLogStudy: (assignmentId: string) => void;
  studyPending: boolean;
  studyLoggedToday: boolean;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  const shown = row.criteria.slice(0, PREVIEW_LIMIT);
  const more = row.criteria.length - shown.length;
  const isTest = row.kind === "TEST";
  const stateBadge = <StudentStateBadge state={row.state} paperTest={isTest} awaitingScan={row.awaitingScan} />;
  // The state badge already says "Paper test" for a test that hasn't happened yet.
  const paperTestBadge =
    isTest && !(row.state === "not_submitted" && !row.awaitingScan) ? <Badge variant="outline">Paper test</Badge> : null;

  return (
    <div className="flex flex-col gap-5">
      {showHeading ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {stateBadge}
            {paperTestBadge}
          </div>
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="text-lg leading-snug font-semibold tracking-tight text-balance break-words text-foreground outline-none"
          >
            {row.title}
          </h3>
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
            <span>{row.className}</span>
            <span aria-hidden>·</span>
            <span className="tabular inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden />
              {dueLabel(row)}
            </span>
            {row.pastDue ? <span className="font-medium text-danger-soft-foreground">· Overdue</span> : null}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {stateBadge}
          {paperTestBadge}
          {row.pastDue ? <Badge variant="danger">Overdue</Badge> : null}
        </div>
      )}

      <p className="text-sm text-pretty text-foreground/90">{statusSummary(row)}</p>

      <div className="grid gap-2 sm:grid-cols-2">
        <PrimaryAction row={row} className="sm:col-span-2" />
        {onPlan ? (
          <Button type="button" variant="outline" onClick={() => onPlan(row.classId)}>
            <Target aria-hidden />
            Plan my grade
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={() => onLogStudy(row.id)}
          disabled={studyPending}
        >
          {studyPending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Timer aria-hidden />}
          Log a study session
        </Button>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        {studyLoggedToday
          ? "Study session logged today. Your streak is safe."
          : "Logging a study session earns 15 XP once a day and keeps your streak going."}
      </p>

      <section aria-label={isTest ? "Test questions" : "Rubric preview"} className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ListChecks className="size-4 text-muted-foreground" aria-hidden />
            {isTest ? "Questions" : "Rubric"}
          </h4>
          {row.criteria.length > 0 ? (
            <span className="tabular text-xs text-muted-foreground">
              {isTest ? `${pluralize(row.criteria.length, "question")} · ` : ""}
              {pluralize(row.totalPoints, "point")}
            </span>
          ) : null}
        </div>
        {row.criteria.length === 0 ? (
          <p className="px-4 py-4 text-[13px] text-muted-foreground">Your teacher hasn&apos;t added rubric criteria yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((criterion) => (
              <li key={criterion.id} className="flex items-baseline justify-between gap-3 px-4 py-2">
                <span className="min-w-0 truncate text-[13px] text-foreground" title={criterion.title}>
                  {criterion.title}
                </span>
                <span className="tabular shrink-0 text-xs text-muted-foreground">{formatPoints(criterion.maxPoints)} pts</span>
              </li>
            ))}
            {more > 0 ? (
              <li className="px-4 py-2 text-xs text-muted-foreground">
                +{more} more on the{" "}
                <Link
                  href={`/student/assignments/${row.id}`}
                  className="font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  assignment page
                </Link>
              </li>
            ) : null}
          </ul>
        )}
      </section>
    </div>
  );
}
