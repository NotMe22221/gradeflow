"use client";

import Link from "next/link";
import { Clock, FileText, Flag, Info, Loader2, RotateCw, Sparkles, UserPlus } from "lucide-react";

import { AddSubmissionDialog } from "@/components/assignments/add-submission-dialog";
import { GRADABLE_STATUSES, useBatchGrading, type LiveRowState } from "@/components/assignments/batch-grading";
import { LOAD_SAMPLES_HINT, LoadSamplesButton } from "@/components/assignments/load-samples";
import type { EligibleStudent, RosterStudent, SubmissionFlag, SubmissionRowData } from "@/components/assignments/types";
import { EmptyState } from "@/components/empty-state";
import { ConfidenceBadge } from "@/components/grading/confidence-badge";
import { StatusBadge } from "@/components/grading/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Confidence } from "@/lib/constants";
import { formatScore, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * What a row shows right now. Live batch state wins while a paper is queued or
 * grading; once the server data catches up (after router.refresh), the
 * server's status takes over again.
 */
type RowView =
  | { kind: "queued" }
  | { kind: "grading" }
  | { kind: "graded"; confidence: Confidence | null; flags: SubmissionFlag[] | number }
  | { kind: "failed"; error: string | null }
  | { kind: "server" };

function rowView(row: SubmissionRowData, live: LiveRowState | undefined): RowView {
  const stale = GRADABLE_STATUSES.includes(row.status) || row.status === "GRADING";
  if (live?.phase === "queued") return { kind: "queued" };
  if (live?.phase === "grading") return { kind: "grading" };
  if (live?.phase === "done" && stale) return { kind: "graded", confidence: live.confidence, flags: live.flagCount };
  if (live?.phase === "failed" && stale) return { kind: "failed", error: live.error };
  if (row.status === "GRADING_FAILED") return { kind: "failed", error: null };
  if (row.status === "NEEDS_REVIEW" && row.ai) {
    return { kind: "graded", confidence: row.ai.confidence, flags: row.ai.flags };
  }
  return { kind: "server" };
}

function Dash({ label }: { label: string }) {
  return (
    <span className="text-muted-foreground/70">
      <span aria-hidden>–</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function FlagsIndicator({ flags }: { flags: SubmissionFlag[] | number }) {
  const count = typeof flags === "number" ? flags : flags.length;
  if (count === 0) return <Dash label="No flags" />;
  const content = (
    <span className="inline-flex items-center gap-1 font-medium text-warning-soft-foreground">
      <Flag className="size-3.5 text-warning" aria-hidden />
      <span className="tabular">{count}</span>
      <span className="sr-only">{count === 1 ? "flag" : "flags"}</span>
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
  const { assignmentId, rows, live, isRunning, start } = useBatchGrading();

  const reviewHref = (submissionId?: string) =>
    `/review?assignment=${encodeURIComponent(assignmentId)}${submissionId ? `&s=${encodeURIComponent(submissionId)}` : ""}`;

  const description =
    rows.length === 0
      ? "Papers appear here as students submit."
      : [
          `${pluralize(rows.length, "paper")} submitted`,
          notSubmitted.length > 0 ? `${notSubmitted.length} not submitted` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle>
          <h2>Submissions</h2>
        </CardTitle>
        <CardDescription className="tabular">{description}</CardDescription>
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
        <div className="border-t border-border">
          <Table className="min-w-[56rem]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Words</TableHead>
                <TableHead>AI confidence</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="pr-6 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const view = rowView(row, live[row.id]);
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
                      {view.kind === "queued" ? (
                        <Badge variant="outline">
                          <Clock aria-hidden />
                          Queued
                        </Badge>
                      ) : view.kind === "grading" ? (
                        <Badge variant="default">
                          <Loader2 className="animate-spin" aria-hidden />
                          Grading…
                        </Badge>
                      ) : view.kind === "graded" ? (
                        <StatusBadge status="NEEDS_REVIEW" />
                      ) : view.kind === "failed" ? (
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
                              <TooltipContent>{view.error}</TooltipContent>
                            </Tooltip>
                          ) : null}
                        </span>
                      ) : (
                        <StatusBadge status={row.status} />
                      )}
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
                        <ConfidenceBadge confidence={view.confidence} showLabel={false} />
                      ) : (
                        <Dash label="No AI suggestion yet" />
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
                      {view.kind === "graded" || (view.kind === "server" && row.status === "NEEDS_REVIEW") ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={reviewHref(row.id)}>Review</Link>
                        </Button>
                      ) : view.kind === "failed" ? (
                        <Button variant="outline" size="sm" onClick={() => start([row.id])} disabled={isRunning}>
                          <RotateCw aria-hidden />
                          Retry
                        </Button>
                      ) : view.kind === "server" && row.status === "SUBMITTED" ? (
                        <Button variant="ghost" size="sm" onClick={() => start([row.id])} disabled={isRunning}>
                          <Sparkles aria-hidden />
                          Run AI pass
                        </Button>
                      ) : view.kind === "server" && row.status === "RETURNED" ? (
                        <span className="text-[13px] text-muted-foreground">Waiting on student</span>
                      ) : null}
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
                  <TableCell className="pr-6 text-right">
                    <AddSubmissionDialog
                      assignmentId={assignmentId}
                      students={eligibleStudents}
                      hasRoster={hasRoster}
                      defaultStudentId={student.id}
                      disabled={isRunning}
                      trigger={
                        <Button variant="ghost" size="sm" disabled={isRunning}>
                          Add paper
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
