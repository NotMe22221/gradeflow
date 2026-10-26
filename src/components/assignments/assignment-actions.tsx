"use client";

import Link from "next/link";
import { Camera, FlaskConical, Inbox, Loader2, MoreVertical, ListChecks, Table2 } from "@/components/icons";

import { AddSubmissionDialog } from "@/components/assignments/add-submission-dialog";
import { useBatchGrading } from "@/components/assignments/batch-grading";
import { LOAD_SAMPLES_HINT, useLoadSamples } from "@/components/assignments/load-samples";
import { scanHref } from "@/components/assignments/scan-links";
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
import type { AssignmentKind } from "@/lib/constants";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The Student work actions beside the Turned in / Assigned / Graded numbers:
 * one filled primary action (run the AI pass, review, or scan), an outlined
 * secondary, "Add submission", and an overflow menu. On phones the primary
 * action comes first at full width.
 *
 * A handwritten test's primary action is "Scan papers": scans arrive already
 * graded, so the batch AI pass only appears when typed papers are waiting.
 */
export function AssignmentActions({
  classId,
  kind,
  eligibleStudents,
  hasRoster,
  missingCount,
  className,
}: {
  classId: string;
  kind: AssignmentKind;
  eligibleStudents: EligibleStudent[];
  hasRoster: boolean;
  /** Enrolled students with no paper yet (sample papers can fill these). */
  missingCount: number;
  className?: string;
}) {
  const { assignmentId, gradableIds, reviewCount, isRunning, run, start } = useBatchGrading();
  const samples = useLoadSamples(assignmentId);
  const reviewHref = `/review?assignment=${encodeURIComponent(assignmentId)}`;
  const gradable = gradableIds.length;
  const test = kind === "TEST";
  // The synthetic sample papers are essays; tests use the sample photos on the scan page.
  const showSamples = !test && missingCount > 0;

  const runningLabel =
    run && isRunning ? `Grading ${Math.min(run.processed + 1, run.total)} of ${run.total}…` : "Grading…";

  const reviewButton = (primary: boolean) => (
    <Button
      variant={primary ? "default" : "outline"}
      asChild
      className={cn("max-sm:w-full", primary && "max-sm:order-first")}
    >
      <Link href={reviewHref}>
        <Inbox aria-hidden />
        Review {pluralize(reviewCount, "paper")}
      </Link>
    </Button>
  );

  const batchButton = (primary: boolean) => (
    <Button
      variant={primary ? "default" : "outline"}
      onClick={() => start()}
      disabled={isRunning}
      className={cn("max-sm:w-full", primary && "max-sm:order-first")}
    >
      {isRunning ? <Loader2 className="animate-spin" aria-hidden /> : <ListChecks aria-hidden />}
      {isRunning ? runningLabel : `Run AI first pass on ${pluralize(gradable, "paper")}`}
    </Button>
  );

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end", className)}>
      {test ? (
        <>
          {reviewCount > 0 && !isRunning ? reviewButton(false) : null}
          {gradable > 0 || isRunning ? batchButton(false) : null}
          {hasRoster ? (
            <Button asChild className="max-sm:order-first max-sm:w-full">
              <Link href={scanHref(assignmentId)}>
                <Camera aria-hidden />
                Scan papers
              </Link>
            </Button>
          ) : null}
        </>
      ) : gradable > 0 || isRunning ? (
        <>
          {reviewCount > 0 && !isRunning ? reviewButton(false) : null}
          {batchButton(true)}
        </>
      ) : reviewCount > 0 ? (
        reviewButton(true)
      ) : null}

      {/* Phones: one row under the main actions. Wider: "Add submission" first, the menu last. */}
      <div className="flex items-center gap-2 max-sm:order-last sm:contents">
        <div className="sm:order-first">
          <AddSubmissionDialog
            assignmentId={assignmentId}
            students={eligibleStudents}
            hasRoster={hasRoster}
            disabled={isRunning}
          />
        </div>
        <div className="ml-auto sm:order-last sm:ml-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More actions">
                {samples.pending ? <Loader2 className="animate-spin" /> : <MoreVertical />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              {showSamples ? (
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
                <Link href={`/classes/${encodeURIComponent(classId)}/grades`}>
                  <Table2 aria-hidden />
                  Open class Grades
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
