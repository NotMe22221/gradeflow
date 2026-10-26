"use client";

import { AlertTriangle, CheckCircle2, CircleSlash, FlaskConical, Loader2, Square, X } from "lucide-react";

import { useBatchGrading, type BatchRun } from "@/components/assignments/batch-grading";
import { GraderBadge } from "@/components/grading/grader-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

function papers(count: number): string {
  return count === 1 ? "paper" : "papers";
}

function describe(run: BatchRun): { title: string; detail: string; tone: "running" | "success" | "danger" | "neutral" } {
  if (run.status === "running" || run.status === "stopping") {
    const current = Math.min(run.processed + 1, run.total);
    return {
      title: `Grading ${current} of ${run.total} ${papers(run.total)}…`,
      detail:
        run.status === "stopping"
          ? "Stopping after this paper. Papers already graded wait in To review."
          : "Each paper is graded on its own against your rubric. Nothing is published until you approve it.",
      tone: "running",
    };
  }
  if (run.status === "stopped") {
    return {
      title: "AI pass stopped",
      detail: `${pluralize(run.succeeded, "paper")} graded. ${pluralize(run.total - run.processed, "paper")} not started.${
        run.failed ? ` ${pluralize(run.failed, "paper")} failed; use Retry in the student list.` : ""
      }`,
      tone: "neutral",
    };
  }
  if (run.failed === 0) {
    return {
      title: "AI first pass complete",
      detail: `${pluralize(run.succeeded, "paper")} ${run.succeeded === 1 ? "is" : "are"} ready for your review. Nothing has been published.`,
      tone: "success",
    };
  }
  if (run.succeeded === 0) {
    return {
      title: "The AI pass did not finish",
      detail: `${pluralize(run.failed, "paper")} could not be graded. Use Retry in the student list to try again.`,
      tone: "danger",
    };
  }
  return {
    title: "AI first pass finished with errors",
    detail: `${pluralize(run.succeeded, "paper")} ready for review. ${pluralize(run.failed, "paper")} could not be graded; use Retry in the student list.`,
    tone: "danger",
  };
}

const TONE = {
  running: { icon: Loader2, className: "bg-primary-soft text-primary", spin: true },
  success: { icon: CheckCircle2, className: "bg-success-soft text-success", spin: false },
  danger: { icon: AlertTriangle, className: "bg-danger-soft text-danger", spin: false },
  neutral: { icon: CircleSlash, className: "bg-secondary text-muted-foreground", spin: false },
} as const;

/** Live progress for the batch AI pass, then a summary until dismissed. */
export function BatchProgressCard() {
  const { run, graderInfo, stop, dismiss } = useBatchGrading();
  if (!run) return null;

  const running = run.status === "running" || run.status === "stopping";
  const { title, detail, tone } = describe(run);
  const { icon: Icon, className: toneClass, spin } = TONE[tone];
  const percent = run.total > 0 ? Math.round((run.processed / run.total) * 100) : 0;

  return (
    <section
      aria-label="AI first pass progress"
      className="rounded-xl border border-border bg-card p-4 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", toneClass)}>
            <Icon className={cn("size-4", spin && "animate-spin")} aria-hidden />
          </div>
          <div className="min-w-0 space-y-1" aria-live="polite" aria-atomic="true">
            <p className="tabular text-sm font-semibold text-foreground">{title}</p>
            <p className="text-sm text-pretty text-muted-foreground">{detail}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 pl-13 sm:pl-0">
          <GraderBadge grader={graderInfo.kind} model={graderInfo.model} />
          {running ? (
            <Button variant="outline" size="sm" onClick={stop} disabled={run.status === "stopping"}>
              <Square aria-hidden />
              {run.status === "stopping" ? "Stopping…" : "Stop after this paper"}
            </Button>
          ) : (
            <Button variant="ghost" size="icon-sm" onClick={dismiss} aria-label="Dismiss progress summary">
              <X />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Progress value={percent} aria-label="Papers graded" aria-valuetext={`${run.processed} of ${run.total} papers`} />
        <span className="tabular shrink-0 text-[13px] font-medium text-muted-foreground">
          {run.processed}/{run.total}
        </span>
      </div>

      {graderInfo.kind === "demo" ? (
        <p className="mt-4 flex items-start gap-2 text-[13px] text-muted-foreground">
          <FlaskConical className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Demo grader: no ANTHROPIC_API_KEY is set, so a local heuristic stands in for Claude. Its scores and quotes
          are placeholders, not real AI output.
        </p>
      ) : null}
    </section>
  );
}
