"use client";

import Link from "next/link";
import {
  ClipboardList,
  Eye,
  ListChecks,
  LoaderCircle,
  MessageSquareText,
  PenLine,
  Plus,
  Target,
  Timer,
} from "lucide-react";

import { AssignmentIcon } from "@/components/classwork/assignment-icon";
import { dueLabel, statusSummary, type InboxAssignment } from "@/components/student/inbox-model";
import { Button } from "@/components/ui/button";
import { formatPoints, pluralize } from "@/lib/format";
import { classTheme } from "@/lib/ui/class-theme";
import { cn } from "@/lib/utils";

const PREVIEW_LIMIT = 5;

/** The one filled action for this assignment: what the student most likely came to do. */
function PrimaryAction({ row, className }: { row: InboxAssignment; className?: string }) {
  const href = `/student/assignments/${encodeURIComponent(row.id)}`;
  const isTest = row.kind === "TEST";
  const [Icon, label] =
    row.state === "not_submitted"
      ? isTest
        ? [ClipboardList, "View test details"]
        : [Plus, "Add your work"]
      : row.state === "returned"
        ? isTest
          ? [MessageSquareText, "Read your teacher’s note"]
          : [PenLine, "Revise and resubmit"]
        : row.state === "submitted"
          ? [Eye, "View your work"]
          : [MessageSquareText, "View your grade"];
  return (
    <Button asChild className={className}>
      <Link href={href}>
        <Icon aria-hidden />
        {label}
      </Link>
    </Button>
  );
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

  return (
    <div className="flex flex-col gap-5">
      {showHeading ? (
        <div className="flex items-start gap-4">
          <AssignmentIcon isTest={isTest} color={classTheme({ name: row.className }).color} />
          <div className="min-w-0 flex-1">
            <h3
              ref={headingRef}
              tabIndex={-1}
              className="text-lg leading-snug font-medium text-balance break-words text-foreground outline-none"
            >
              {row.title}
            </h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {row.className}
              <span aria-hidden> · </span>
              <span className={cn("tabular", row.pastDue && "font-medium text-danger")}>{dueLabel(row)}</span>
            </p>
          </div>
        </div>
      ) : null}

      <p className="rounded-lg bg-secondary px-4 py-3 text-sm text-pretty text-foreground/90">{statusSummary(row)}</p>

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
          className={onPlan ? undefined : "sm:col-span-2"}
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

      <section
        aria-label={isTest ? "Test questions" : "Rubric preview"}
        className="overflow-hidden rounded-lg border border-border bg-card"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
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
          <p className="px-4 py-4 text-[13px] text-muted-foreground">
            Your teacher hasn&apos;t added rubric criteria yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((criterion) => (
              <li key={criterion.id} className="flex items-baseline justify-between gap-3 px-4 py-2">
                <span className="min-w-0 truncate text-[13px] text-foreground" title={criterion.title}>
                  {criterion.title}
                </span>
                <span className="tabular shrink-0 text-xs text-muted-foreground">
                  {formatPoints(criterion.maxPoints)} pts
                </span>
              </li>
            ))}
            {more > 0 ? (
              <li className="px-4 py-2 text-xs text-muted-foreground">
                +{more} more on the{" "}
                <Link
                  href={`/student/assignments/${encodeURIComponent(row.id)}`}
                  className="font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
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
