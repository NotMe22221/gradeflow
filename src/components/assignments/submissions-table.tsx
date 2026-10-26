"use client";

import Link from "next/link";
import { Camera, Clock, Flag, Info, Loader2, RotateCw, Sparkles, UserPlus } from "lucide-react";

import { AddSubmissionDialog } from "@/components/assignments/add-submission-dialog";
import { useBatchGrading, type LiveRowState } from "@/components/assignments/batch-grading";
import { LOAD_SAMPLES_HINT, LoadSamplesButton } from "@/components/assignments/load-samples";
import { scanHref } from "@/components/assignments/scan-links";
import type { EligibleStudent, RosterStudent, SubmissionFlag, SubmissionRowData } from "@/components/assignments/types";
import { EmptyState } from "@/components/empty-state";
import { ConfidenceBadge } from "@/components/grading/confidence-badge";
import { GraderBadge } from "@/components/grading/grader-badge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GRADER_LABELS, type AssignmentKind, type Confidence, type GraderKind } from "@/lib/constants";
import { formatScore, pluralize } from "@/lib/format";
import type { GraderInfo } from "@/lib/grading/config";
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
  // A scan is graded as it is scanned; rescanning (not the essay AI pass) replaces it.
  if (row.source === "SCAN" && (view.kind === "failed" || row.status === "SUBMITTED")) return null;
  if (view.kind === "failed") return "retry";
  if (view.kind === "server" && row.status === "SUBMITTED") return "run";
  if (view.kind === "server" && row.status === "RETURNED") return "waiting";
  return null;
}

/** Classroom's grading-list groups, matching the Turned in / Assigned / Graded numbers. */
type Group = "turnedIn" | "assigned" | "graded";

function rowGroup(row: SubmissionRowData): Group {
  if (row.published) return "graded";
  if (row.status === "RETURNED") return "assigned";
  return "turnedIn";
}

function FlagsIndicator({ flags }: { flags: SubmissionFlag[] | number }) {
  const count = typeof flags === "number" ? flags : flags.length;
  if (count === 0) return null;
  const noun = count === 1 ? "flag" : "flags";
  const content = (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-warning-soft-foreground">
      <Flag className="size-3.5 text-warning" aria-hidden />
      <span className="tabular">{count}</span>
      <span>{noun}</span>
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

/** Status words in Google Classroom's style; status colors only where they mean something. */
function RowStatus({
  row,
  view,
  grader,
  showGrader,
  test,
}: {
  row: SubmissionRowData;
  view: RowView;
  grader: GraderKind | null;
  showGrader: boolean;
  test: boolean;
}) {
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
      <span className="flex items-center gap-2">
        <Badge variant="default">
          <Loader2 className="animate-spin" aria-hidden />
          Grading…
        </Badge>
        <Skeleton className="h-5 w-24 rounded-full" />
      </span>
    );
  }
  if (view.kind === "graded") {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <Badge variant="warning">Needs review</Badge>
        {view.confidence ? <ConfidenceBadge confidence={view.confidence} /> : null}
        <FlagsIndicator flags={view.flags} />
        {showGrader && grader ? <span className="text-xs text-muted-foreground">{GRADER_LABELS[grader]}</span> : null}
      </span>
    );
  }
  if (view.kind === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Badge variant="danger">AI pass failed</Badge>
        {view.error ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
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
  if (row.published) {
    return (
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="tabular text-sm font-medium text-foreground">
          {formatScore(row.published.total, row.published.max)}
        </span>
        <span className="text-xs text-muted-foreground">Returned</span>
      </span>
    );
  }
  switch (row.status) {
    case "SUBMITTED":
      return (
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[13px] font-medium text-success">{test ? "Scanned" : "Turned in"}</span>
          {row.source !== "SCAN" ? <span className="text-xs text-muted-foreground">Ready for AI pass</span> : null}
        </span>
      );
    case "RETURNED":
      return (
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[13px] font-medium text-foreground">Sent back</span>
          <span className="text-xs text-muted-foreground">{test ? "Waiting for a rescan" : "Waiting on student"}</span>
        </span>
      );
    case "APPROVED":
      return <Badge variant="success">Approved</Badge>;
    case "NEEDS_REVIEW":
      return <Badge variant="warning">Needs review</Badge>;
    default:
      return <span className="text-[13px] text-muted-foreground">{row.status}</span>;
  }
}

/** The row's next step: review, retry, or run. */
function RowAction({
  row,
  kind,
  reviewHref,
  onRun,
  disabled,
}: {
  row: SubmissionRowData;
  kind: RowActionKind;
  reviewHref: string;
  onRun: () => void;
  disabled: boolean;
}) {
  const who = <span className="sr-only"> for {row.student.name}</span>;
  const size = "max-md:h-10";
  if (kind === "review") {
    return (
      <Button variant="outline" size="sm" asChild className={size}>
        <Link href={reviewHref}>
          Review
          {who}
        </Link>
      </Button>
    );
  }
  if (kind === "retry") {
    return (
      <Button variant="outline" size="sm" onClick={onRun} disabled={disabled} className={size}>
        <RotateCw aria-hidden />
        Retry AI pass
        {who}
      </Button>
    );
  }
  if (kind === "run") {
    return (
      <Button variant="text" size="sm" onClick={onRun} disabled={disabled} className={size}>
        <Sparkles aria-hidden />
        Run AI pass
        {who}
      </Button>
    );
  }
  return null;
}

/** "Scanned · 2 pages" for a handwritten test read by the camera grader. */
function ScannedHint({ row }: { row: SubmissionRowData }) {
  return (
    <span className="tabular inline-flex items-center gap-1">
      <Camera className="size-3 shrink-0" aria-hidden />
      Scanned{row.pageCount > 0 ? ` · ${pluralize(row.pageCount, "page")}` : ""}
    </span>
  );
}

/** Opens the camera grader for one student. A new scan replaces a paper that is not yet approved. */
function ScanLink({
  assignmentId,
  student,
  rescan,
}: {
  assignmentId: string;
  student: { id: string; name: string };
  rescan: boolean;
}) {
  return (
    <Button variant="ghost" size="sm" asChild className="max-md:h-10">
      <Link href={scanHref(assignmentId, student.id)}>
        <Camera aria-hidden />
        {/* Phones: icon only when it sits beside another action. */}
        <span className={rescan ? "max-md:sr-only" : undefined}>{rescan ? "Rescan" : "Scan"}</span>
        <span className="sr-only"> test for {student.name}</span>
      </Link>
    </Button>
  );
}

/** Says which grader produced (or will produce) the suggestions on this page. */
function GraderNote({
  graders,
  hasOutput,
  firstPass,
}: {
  graders: GraderKind[];
  hasOutput: boolean;
  /** The engine that grades the next paper (the camera grader for a handwritten test). */
  firstPass: GraderInfo;
}) {
  const { graderInfo } = useBatchGrading();
  const shown = graders.length > 0 ? graders : [firstPass.kind];
  const modelFor = (grader: GraderKind) =>
    grader === firstPass.kind ? firstPass.model : grader === graderInfo.kind ? graderInfo.model : null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
      <span>{hasOutput ? "Suggestions by" : "First pass by"}</span>
      {shown.map((grader) => (
        <GraderBadge key={grader} grader={grader} model={modelFor(grader)} />
      ))}
    </div>
  );
}

/** Row grid: avatar | name | (status) | action. On phones the status drops under the name. */
const ROW =
  "grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,20rem)_9.5rem] md:gap-x-4 md:px-6";
const STATUS_CELL = "col-span-3 row-start-2 min-w-0 pl-11 md:col-span-1 md:col-start-3 md:row-start-1 md:pl-0";
const ACTION_CELL = "col-start-3 row-start-1 flex items-center justify-end gap-1 md:col-start-4";

function GroupHeading({ id, title, count }: { id: string; title: string; count: number }) {
  return (
    <h3
      id={id}
      className="flex items-center gap-2 border-y border-border bg-background px-4 py-2 font-sans text-[13px] font-medium text-muted-foreground md:px-6"
    >
      {title}
      <span className="tabular rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
        {count}
      </span>
    </h3>
  );
}

/**
 * The student list on the assignment's Student work tab, in the style of
 * Google Classroom's grading list: grouped into Turned in, Assigned, and
 * Graded, each row an avatar, the student, a status in Classroom's words
 * (with AI confidence and flags while a draft waits for review), and the next
 * step. Live batch state shows on each row as the AI pass runs.
 */
export function SubmissionsTable({
  classId,
  kind = "ESSAY",
  scanGrader = null,
  notSubmitted,
  eligibleStudents,
  hasRoster,
  pastDue = false,
}: {
  classId: string;
  kind?: AssignmentKind;
  /** The camera grader that reads scanned tests (GPT-4o, or the demo scanner). */
  scanGrader?: GraderInfo | null;
  notSubmitted: RosterStudent[];
  eligibleStudents: EligibleStudent[];
  hasRoster: boolean;
  /** The due day has ended: students with nothing turned in read "Missing" (never for paper tests). */
  pastDue?: boolean;
}) {
  const { assignmentId, rows, liveFor, isRunning, start, graderInfo } = useBatchGrading();
  const test = kind === "TEST";
  // Students whose paper a new scan may replace (nothing approved, published, or grading).
  const scannable = new Set(test ? eligibleStudents.map((student) => student.id) : []);
  const firstPass = test && scanGrader ? scanGrader : graderInfo;

  const reviewHref = (submissionId?: string) =>
    `/review?assignment=${encodeURIComponent(assignmentId)}${submissionId ? `&s=${encodeURIComponent(submissionId)}` : ""}`;

  const views = rows.map((row) => {
    const view = rowView(row, liveFor(row));
    return { row, view, grader: rowGrader(row, view), action: rowActionKind(row, view), group: rowGroup(row) };
  });
  const graders = Array.from(new Set(views.flatMap(({ grader }) => (grader ? [grader] : [])))).sort();
  // With output from more than one grader, each row says which one it came from.
  const mixedGraders = graders.length > 1;

  if (!hasRoster && rows.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Add students to this class before collecting papers."
        action={
          <Button variant="outline" asChild>
            <Link href={`/classes/${encodeURIComponent(classId)}/people`}>Go to People</Link>
          </Button>
        }
      />
    );
  }

  const addPaper = (student: RosterStudent) => (
    <AddSubmissionDialog
      assignmentId={assignmentId}
      students={eligibleStudents}
      hasRoster={hasRoster}
      defaultStudentId={student.id}
      disabled={isRunning}
      trigger={
        <Button variant="text" size="sm" disabled={isRunning} className="max-md:h-10">
          Add paper
          <span className="sr-only"> for {student.name}</span>
        </Button>
      }
    />
  );

  const renderRow = ({ row, view, grader, action }: (typeof views)[number]) => {
    const busy = view.kind === "grading";
    const canScan = scannable.has(row.student.id);
    return (
      <li key={row.id} className={cn(ROW, busy && "bg-primary-soft/40")} aria-busy={busy || undefined}>
        <Avatar name={row.student.name} className="size-8" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{row.student.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            <span title={row.submittedTitle}>{row.submittedLabel}</span>
            {row.source === "SCAN" ? (
              <>
                {" · "}
                <ScannedHint row={row} />
              </>
            ) : (
              <>
                <span className="tabular">
                  {" · "}
                  {row.wordCount.toLocaleString("en-US")} {row.wordCount === 1 ? "word" : "words"}
                </span>
                {row.fileName ? <span title={row.fileName}> · {row.fileName}</span> : null}
              </>
            )}
          </p>
        </div>
        <div className={STATUS_CELL}>
          <RowStatus row={row} view={view} grader={grader} showGrader={mixedGraders} test={test} />
        </div>
        <div className={ACTION_CELL}>
          {canScan ? <ScanLink assignmentId={assignmentId} student={row.student} rescan /> : null}
          <RowAction
            row={row}
            kind={action}
            reviewHref={reviewHref(row.id)}
            onRun={() => start([row.id])}
            disabled={isRunning}
          />
        </div>
      </li>
    );
  };

  const turnedIn = views.filter((entry) => entry.group === "turnedIn");
  const sentBack = views.filter((entry) => entry.group === "assigned");
  const graded = views.filter((entry) => entry.group === "graded");
  const assignedCount = sentBack.length + notSubmitted.length;
  const labels = test
    ? { turnedIn: "Scanned", assigned: "Not scanned", graded: "Graded" }
    : { turnedIn: "Turned in", assigned: "Assigned", graded: "Graded" };

  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">All students</h2>
          <p className="tabular text-[13px] text-muted-foreground">
            {pluralize(rows.length + notSubmitted.length, "student")}
          </p>
        </div>
        <GraderNote graders={graders} hasOutput={graders.length > 0} firstPass={firstPass} />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col gap-4 border-t border-border bg-secondary/60 px-4 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <p className="max-w-xl text-sm text-pretty text-foreground">
            {test
              ? firstPass.kind === "openai"
                ? "No tests scanned yet. Photograph each student's test: GPT-4o reads the handwriting and drafts scores against your answer key for your review."
                : "No tests scanned yet. The demo scanner reads the bundled sample photos and drafts scores for your review."
              : "No papers yet. Students turn in work from their assignment page, or you can add a paper for them."}
          </p>
          {!test ? (
            <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
              <LoadSamplesButton assignmentId={assignmentId} variant="tonal" disabled={isRunning} />
              <p className="text-xs text-muted-foreground">{LOAD_SAMPLES_HINT}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {turnedIn.length > 0 ? (
        <section aria-labelledby="group-turned-in">
          <GroupHeading id="group-turned-in" title={labels.turnedIn} count={turnedIn.length} />
          <ul className="divide-y divide-border">{turnedIn.map(renderRow)}</ul>
        </section>
      ) : null}

      {assignedCount > 0 ? (
        <section aria-labelledby="group-assigned">
          <GroupHeading id="group-assigned" title={labels.assigned} count={assignedCount} />
          <ul className="divide-y divide-border">
            {sentBack.map(renderRow)}
            {notSubmitted.map((student) => (
              <li key={student.id} className={ROW}>
                <Avatar name={student.name} className="size-8 opacity-70" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{student.name}</p>
                </div>
                <div className={STATUS_CELL}>
                  {test ? (
                    <span className="text-[13px] text-muted-foreground">Not scanned yet</span>
                  ) : pastDue ? (
                    <span className="text-[13px] font-medium text-danger">Missing</span>
                  ) : (
                    <span className="text-[13px] text-muted-foreground">Assigned</span>
                  )}
                </div>
                <div className={ACTION_CELL}>
                  {test ? <ScanLink assignmentId={assignmentId} student={student} rescan={false} /> : addPaper(student)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {graded.length > 0 ? (
        <section aria-labelledby="group-graded">
          <GroupHeading id="group-graded" title={labels.graded} count={graded.length} />
          <ul className="divide-y divide-border">{graded.map(renderRow)}</ul>
        </section>
      ) : null}
    </Card>
  );
}
