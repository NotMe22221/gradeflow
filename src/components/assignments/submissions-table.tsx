"use client";

import Link from "next/link";
import { Clock, FileText, Flag, Info, Loader2, RotateCw, Sparkles, UserPlus } from "lucide-react";

import { AddSubmissionDialog } from "@/components/assignments/add-submission-dialog";
import { useBatchGrading, type LiveRowState } from "@/components/assignments/batch-grading";
import { LOAD_SAMPLES_HINT, LoadSamplesButton } from "@/components/assignments/load-samples";
import type { EligibleStudent, RosterStudent, SubmissionFlag, SubmissionRowData } from "@/components/assignments/types";
import { EmptyState } from "@/components/empty-state";
import { ConfidenceBadge } from "@/components/grading/confidence-badge";
import { GraderBadge } from "@/components/grading/grader-badge";
import { StatusBadge } from "@/components/grading/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GRADER_LABELS, type Confidence, type GraderKind } from "@/lib/constants";
import { formatScore, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

const INTERRUPTED_MESSAGE =
  "The AI pass stopped before it finished, for example because the server restarted. Retry it.";

/**
 * What a row shows right now. Live batch state wins while a paper is queued or
 * grading; once the server data catches up (after router.refresh), the
 * server's status takes over again.
 */
type RowView =
  | { kind: "queued" }
  | { kind: "grading" }
  | { kind: "graded"; confidence: Confidence | null; flags: SubmissionFlag[] | number; grader: GraderKind }
  | { kind: "failed"; error: string | null }
  | { kind: "server" };

function rowView(row: SubmissionRowData, live: LiveRowState | undefined): RowView {
  if (live?.phase === "queued") return { kind: "queued" };
  if (live?.phase === "grading") return { kind: "grading" };
  if (live?.phase === "done") {
    return { kind: "graded", confidence: live.confidence, flags: live.flagCount, grader: live.grader };
  }
  if (live?.phase === "failed") return { kind: "failed", error: live.error };
  if (row.status === "GRADING_FAILED") return { kind: "failed", error: row.interrupted ? INTERRUPTED_MESSAGE : null };
  if (row.status === "NEEDS_REVIEW" && row.ai) {
    return { kind: "graded", confidence: row.ai.confidence, flags: row.ai.flags, grader: row.ai.grader };
  }
  return { kind: "server" };
}

/** The grader behind the AI output a row shows, if any. */
function rowGrader(row: SubmissionRowData, view: RowView): GraderKind | null {
  if (view.kind === "graded") return view.grader;
  if (view.kind === "server" && row.ai) return row.ai.grader;
  return null;
}

type RowActionKind = "review" | "retry" | "run" | "waiting" | null;

function rowActionKind(row: SubmissionRowData, view: RowView): RowActionKind {
  if (view.kind === "graded" || (view.kind === "server" && row.status === "NEEDS_REVIEW")) return "review";
  if (view.kind === "failed") return "retry";
  if (view.kind === "server" && row.status === "SUBMITTED") return "run";
  if (view.kind === "server" && row.status === "RETURNED") return "waiting";
  return null;
}

function Dash({ label }: { label: string }) {
  return (
    <span className="text-muted-foreground/70">
      <span aria-hidden>–</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function FlagsIndicator({ flags, showLabel = false }: { flags: SubmissionFlag[] | number; showLabel?: boolean }) {
  const count = typeof flags === "number" ? flags : flags.length;
  if (count === 0) return <Dash label="No flags" />;
  const noun = count === 1 ? "flag" : "flags";
  const content = (
    <span className="inline-flex items-center gap-1 font-medium text-warning-soft-foreground">
      <Flag className="size-3.5 text-warning" aria-hidden />
      <span className="tabular">{count}</span>
      <span className={showLabel ? undefined : "sr-only"}>{noun}</span>
    </span>
  );
  if (typeof flags === "number") return content;

  const messages = Array.from(new Set(flags.map((flag) => flag.message)));
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          aria-label={`${pluralize(count, "flag")}: ${messages.join(" ")}`}
        >
          {content}
        </button>
      </TooltipTrigger>
      <TooltipContent align="start" className="max-w-sm">
        <p className="mb-1 font-medium">Flagged for a closer look</p>
        <ul className="list-disc space-y-1 pl-4">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

function GradingCell({ label = false }: { label?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <Skeleton className="h-5 w-16 rounded-full" />
      {label ? <span className="text-[13px] text-muted-foreground">Grading…</span> : null}
    </span>
  );
}

function RowStatus({ row, view }: { row: SubmissionRowData; view: RowView }) {
  if (view.kind === "queued") {
    return (
      <Badge variant="outline">
        <Clock aria-hidden />
        Queued
      </Badge>
    );
  }
  if (view.kind === "grading") {
    return (
      <Badge variant="default">
        <Loader2 className="animate-spin" aria-hidden />
        Grading…
      </Badge>
    );
  }
  if (view.kind === "graded") return <StatusBadge status="NEEDS_REVIEW" />;
  if (view.kind === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <StatusBadge status="GRADING_FAILED" />
        {view.error ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
                aria-label={`Why it failed: ${view.error}`}
              >
                <Info className="size-3.5" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{view.error}</TooltipContent>
          </Tooltip>
        ) : null}
      </span>
    );
  }
  return <StatusBadge status={row.status} />;
}

/** The row's single next step: review, retry, run, or a note. */
function RowAction({
  row,
  kind,
  reviewHref,
  onRun,
  disabled,
  className,
}: {
  row: SubmissionRowData;
  kind: RowActionKind;
  reviewHref: string;
  onRun: () => void;
  disabled: boolean;
  className?: string;
}) {
  const who = <span className="sr-only"> for {row.student.name}</span>;
  if (kind === "review") {
    return (
      <Button variant="outline" size="sm" asChild className={className}>
        <Link href={reviewHref}>
          Review
          {who}
        </Link>
      </Button>
    );
  }
  if (kind === "retry") {
    return (
      <Button variant="outline" size="sm" onClick={onRun} disabled={disabled} className={className}>
        <RotateCw aria-hidden />
        Retry AI pass
        {who}
      </Button>
    );
  }
  if (kind === "run") {
    return (
      <Button variant="ghost" size="sm" onClick={onRun} disabled={disabled} className={className}>
        <Sparkles aria-hidden />
        Run AI pass
        {who}
      </Button>
    );
  }
  if (kind === "waiting") return <span className="text-[13px] text-muted-foreground">Waiting on student</span>;
  return null;
}

/** Says which grader produced (or will produce) the suggestions on this page. */
function GraderNote({ graders, hasOutput }: { graders: GraderKind[]; hasOutput: boolean }) {
  const { graderInfo } = useBatchGrading();
  const shown = graders.length > 0 ? graders : [graderInfo.kind];
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground sm:justify-end">
      <span>{hasOutput ? "Suggestions by" : "First pass by"}</span>
      {shown.map((grader) => (
        <GraderBadge key={grader} grader={grader} model={grader === graderInfo.kind ? graderInfo.model : null} />
      ))}
    </div>
  );
}

export function SubmissionsTable({
  classId,
  notSubmitted,
  eligibleStudents,
  hasRoster,
}: {
  classId: string;
  notSubmitted: RosterStudent[];
  eligibleStudents: EligibleStudent[];
  hasRoster: boolean;
}) {
  const { assignmentId, rows, liveFor, isRunning, start } = useBatchGrading();

  const reviewHref = (submissionId?: string) =>
    `/review?assignment=${encodeURIComponent(assignmentId)}${submissionId ? `&s=${encodeURIComponent(submissionId)}` : ""}`;

  const views = rows.map((row) => {
    const view = rowView(row, liveFor(row));
    return { row, view, grader: rowGrader(row, view), action: rowActionKind(row, view) };
  });
  const graders = Array.from(new Set(views.flatMap(({ grader }) => (grader ? [grader] : [])))).sort();
  // With output from more than one grader, each row says which one it came from.
  const mixedGraders = graders.length > 1;

  const description =
    rows.length === 0
      ? "Papers appear here as students submit."
      : [
          `${pluralize(rows.length, "paper")} submitted`,
          notSubmitted.length > 0 ? `${notSubmitted.length} not submitted` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  const addPaper = (student: RosterStudent) => (
    <AddSubmissionDialog
      assignmentId={assignmentId}
      students={eligibleStudents}
      hasRoster={hasRoster}
      defaultStudentId={student.id}
      disabled={isRunning}
      trigger={
        <Button variant="ghost" size="sm" disabled={isRunning}>
          Add paper
          <span className="sr-only"> for {student.name}</span>
        </Button>
      }
    />
  );

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1.5">
          <CardTitle>
            <h2>Submissions</h2>
          </CardTitle>
          <CardDescription className="tabular">{description}</CardDescription>
        </div>
        {rows.length > 0 ? <GraderNote graders={graders} hasOutput={graders.length > 0} /> : null}
      </CardHeader>

      {rows.length === 0 ? (
        <div className="px-6 pb-6">
          {hasRoster ? (
            <EmptyState
              icon={FileText}
              title="No papers yet. Students submit from their assignment page, or you can add one here."
              action={
                <div className="flex flex-col items-center gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <AddSubmissionDialog
                      assignmentId={assignmentId}
                      students={eligibleStudents}
                      hasRoster={hasRoster}
                    />
                    <LoadSamplesButton assignmentId={assignmentId} variant="secondary" />
                  </div>
                  <p className="text-[13px] text-muted-foreground">{LOAD_SAMPLES_HINT}</p>
                </div>
              }
            />
          ) : (
            <EmptyState
              icon={UserPlus}
              title="Add students to this class before collecting papers."
              action={
                <Button variant="outline" asChild>
                  <Link href={`/classes/${encodeURIComponent(classId)}`}>Go to the roster</Link>
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <>
          {/* Below xl the table would scroll sideways and hide the row actions: stack each paper instead. */}
          <ul className="divide-y divide-border border-t border-border xl:hidden" aria-label="Submissions">
            {views.map(({ row, view, grader, action }) => {
              const busy = view.kind === "grading";
              const confidence = view.kind === "graded" ? view.confidence : null;
              const flagSource = view.kind === "graded" ? view.flags : view.kind === "server" && row.ai ? row.ai.flags : 0;
              const flagCount = typeof flagSource === "number" ? flagSource : flagSource.length;
              const hasDetails =
                busy || confidence !== null || flagCount > 0 || row.published !== null || action === "waiting";
              const hasAction = action !== null && action !== "waiting";
              return (
                <li
                  key={row.id}
                  className={cn("px-6 py-4", busy && "bg-primary-soft/40")}
                  aria-busy={busy || undefined}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={row.student.name} />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{row.student.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            <span title={row.submittedTitle}>{row.submittedLabel}</span>
                            <span className="tabular">
                              {" · "}
                              {row.wordCount.toLocaleString("en-US")} {row.wordCount === 1 ? "word" : "words"}
                            </span>
                            {row.fileName ? <span title={row.fileName}> · {row.fileName}</span> : null}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <RowStatus row={row} view={view} />
                        </div>
                      </div>

                      {hasDetails || hasAction ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          {hasDetails ? (
                            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                              {busy ? (
                                <GradingCell label />
                              ) : (
                                <>
                                  {confidence ? (
                                    <span className="inline-flex flex-wrap items-center gap-2">
                                      <ConfidenceBadge confidence={confidence} />
                                      {mixedGraders && grader ? (
                                        <span className="text-xs text-muted-foreground">{GRADER_LABELS[grader]}</span>
                                      ) : null}
                                    </span>
                                  ) : null}
                                  {flagCount > 0 ? <FlagsIndicator flags={flagSource} showLabel /> : null}
                                  {row.published ? (
                                    <span className="text-muted-foreground">
                                      Score{" "}
                                      <span className="tabular font-medium text-foreground">
                                        {formatScore(row.published.total, row.published.max)}
                                      </span>
                                    </span>
                                  ) : null}
                                  {action === "waiting" ? (
                                    <span className="text-muted-foreground">Waiting on student</span>
                                  ) : null}
                                </>
                              )}
                            </div>
                          ) : null}
                          {hasAction ? (
                            <div className="sm:ml-auto sm:shrink-0">
                              <RowAction
                                row={row}
                                kind={action}
                                reviewHref={reviewHref(row.id)}
                                onRun={() => start([row.id])}
                                disabled={isRunning}
                                className="w-full sm:w-auto"
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}

            {notSubmitted.map((student) => (
              <li key={student.id} className="flex items-center gap-3 px-6 py-3">
                <Avatar name={student.name} className="opacity-60" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-muted-foreground">{student.name}</p>
                  <p className="text-xs text-muted-foreground">Not submitted</p>
                </div>
                <div className="shrink-0">{addPaper(student)}</div>
              </li>
            ))}
          </ul>

          <div className="hidden border-t border-border xl:block">
            <Table className="min-w-[56rem]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Words</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="pr-6 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {views.map(({ row, view, grader, action }) => {
                  const busy = view.kind === "grading";
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(busy && "bg-primary-soft/40 hover:bg-primary-soft/40")}
                      aria-busy={busy || undefined}
                    >
                      <TableCell className="pl-6">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar name={row.student.name} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{row.student.name}</p>
                            {row.fileName ? (
                              <p className="max-w-48 truncate text-xs text-muted-foreground" title={row.fileName}>
                                {row.fileName}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <RowStatus row={row} view={view} />
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        <span title={row.submittedTitle}>{row.submittedLabel}</span>
                      </TableCell>

                      <TableCell className="tabular text-right text-muted-foreground">
                        {row.wordCount.toLocaleString("en-US")}
                      </TableCell>

                      <TableCell>
                        {busy ? (
                          <GradingCell label />
                        ) : view.kind === "graded" && view.confidence ? (
                          <span className="inline-flex items-center gap-2">
                            <ConfidenceBadge confidence={view.confidence} showLabel={false} />
                            {mixedGraders && grader ? (
                              <span className="text-xs text-muted-foreground">{GRADER_LABELS[grader]}</span>
                            ) : null}
                          </span>
                        ) : (
                          <Dash label="No suggestion yet" />
                        )}
                      </TableCell>

                      <TableCell>
                        {busy ? (
                          <Skeleton className="h-5 w-8 rounded-full" />
                        ) : view.kind === "graded" ? (
                          <FlagsIndicator flags={view.flags} />
                        ) : view.kind === "server" && row.ai ? (
                          <FlagsIndicator flags={row.ai.flags} />
                        ) : (
                          <Dash label="No flags" />
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {busy ? (
                          <Skeleton className="ml-auto h-5 w-12" />
                        ) : row.published ? (
                          <span className="tabular font-medium text-foreground">
                            {formatScore(row.published.total, row.published.max)}
                          </span>
                        ) : (
                          <Dash label="Not published" />
                        )}
                      </TableCell>

                      <TableCell className="pr-6 text-right">
                        <RowAction
                          row={row}
                          kind={action}
                          reviewHref={reviewHref(row.id)}
                          onRun={() => start([row.id])}
                          disabled={isRunning}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}

                {notSubmitted.map((student) => (
                  <TableRow key={student.id} className="hover:bg-transparent">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar name={student.name} className="opacity-60" />
                        <span className="truncate text-muted-foreground">{student.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-[13px] text-muted-foreground">Not submitted</span>
                    </TableCell>
                    <TableCell colSpan={5} />
                    <TableCell className="pr-6 text-right">{addPaper(student)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </Card>
  );
}
