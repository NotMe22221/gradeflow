"use client";

import Link from "next/link";
import { FlaskConical, Inbox, Loader2, MoreHorizontal, Sparkles, Table2 } from "lucide-react";

import { AddSubmissionDialog } from "@/components/assignments/add-submission-dialog";
import { useBatchGrading } from "@/components/assignments/batch-grading";
import { LOAD_SAMPLES_HINT, useLoadSamples } from "@/components/assignments/load-samples";
import type { EligibleStudent } from "@/components/assignments/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pluralize } from "@/lib/format";

/** Page-header actions: overflow menu, add submission, and the AI pass / review CTA. */
export function AssignmentActions({
  classId,
  eligibleStudents,
  hasRoster,
  missingCount,
}: {
  classId: string;
  eligibleStudents: EligibleStudent[];
  hasRoster: boolean;
  /** Enrolled students with no paper yet (sample papers can fill these). */
  missingCount: number;
}) {
  const { assignmentId, gradableIds, reviewCount, isRunning, run, start } = useBatchGrading();
  const samples = useLoadSamples(assignmentId);
  const reviewHref = `/review?assignment=${encodeURIComponent(assignmentId)}`;
  const gradable = gradableIds.length;

  const runningLabel =
    run && isRunning ? `Grading ${Math.min(run.processed + 1, run.total)} of ${run.total}…` : "Grading…";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="More actions">
            {samples.pending ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          {missingCount > 0 ? (
            <>
              <DropdownMenuLabel>Demo</DropdownMenuLabel>
              <DropdownMenuItem onSelect={samples.load} disabled={samples.pending || isRunning} className="items-start">
                <FlaskConical className="mt-0.5" aria-hidden />
                <span className="grid gap-0.5">
                  <span>Load sample papers (demo)</span>
                  <span className="text-xs text-muted-foreground">{LOAD_SAMPLES_HINT}</span>
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem asChild>
            <Link href={`/gradebook?class=${encodeURIComponent(classId)}`}>
              <Table2 aria-hidden />
              Open gradebook
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddSubmissionDialog
        assignmentId={assignmentId}
        students={eligibleStudents}
        hasRoster={hasRoster}
        disabled={isRunning}
      />

      {gradable > 0 || isRunning ? (
        <>
          {reviewCount > 0 && !isRunning ? (
            <Button variant="outline" asChild>
              <Link href={reviewHref}>
                <Inbox aria-hidden />
                Review {pluralize(reviewCount, "paper")}
              </Link>
            </Button>
          ) : null}
          <Button onClick={() => start()} disabled={isRunning}>
            {isRunning ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
            {isRunning ? runningLabel : `Run AI first pass on ${pluralize(gradable, "paper")}`}
          </Button>
        </>
      ) : reviewCount > 0 ? (
        <Button asChild>
          <Link href={reviewHref}>
            <Inbox aria-hidden />
            Review {pluralize(reviewCount, "paper")}
          </Link>
        </Button>
      ) : null}
    </>
  );
}
