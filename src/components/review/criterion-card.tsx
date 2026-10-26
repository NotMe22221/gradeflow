"use client";

import { useId, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  FlaskConical,
  Pencil,
  RotateCcw,
  PenLine,
} from "@/components/icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AssignmentKind, GraderKind } from "@/lib/constants";
import { formatPoints } from "@/lib/format";
import { criterionGuideLabel } from "@/lib/review/media";
import {
  MAX_COMMENT_CHARS,
  checkScore,
  criterionCardId,
  quoteIsClipped,
  scoreInputId,
  type CriterionDraft,
} from "@/lib/review/model";
import { SCORE_STEP } from "@/lib/review/scores";
import type { ReviewCriterion } from "@/lib/review/types";
import { cn } from "@/lib/utils";

export function CriterionCard({
  submissionId,
  criterion,
  number,
  draft,
  grader,
  kind = "ESSAY",
  scanned = false,
  evidenceVerified,
  onScoreChange,
  onCommentChange,
  onResetScore,
  onShowEvidence,
}: {
  submissionId: string;
  criterion: ReviewCriterion;
  number: number;
  draft: CriterionDraft;
  grader: GraderKind | null;
  /** TEST criteria are questions: the description is the answer key. */
  kind?: AssignmentKind;
  /** The paper is a transcription of scanned photos. */
  scanned?: boolean;
  /** The quote was verified and located in the paper. */
  evidenceVerified: boolean;
  onScoreChange: (raw: string) => void;
  onCommentChange: (comment: string) => void;
  onResetScore: () => void;
  onShowEvidence: () => void;
}) {
  // A test's answer key is short and checked on every question, so it starts open.
  const [showDescription, setShowDescription] = useState(kind === "TEST");
  const descriptionId = useId();
  const errorId = useId();
  const commentId = useId();
  const inputId = scoreInputId(submissionId, criterion.id);

  const check = checkScore(draft.raw, criterion.maxPoints);
  const blank = !check.error && check.value === null;
  const edited =
    criterion.aiScore !== null && (check.error !== null || check.value !== criterion.aiScore);
  const commentTooLong = draft.comment.length > MAX_COMMENT_CHARS;
  const nearCommentLimit = draft.comment.length > MAX_COMMENT_CHARS - 200;
  const demo = grader === "demo";
  const test = kind === "TEST";

  return (
    <div
      id={criterionCardId(submissionId, criterion.id)}
      className={cn(
        "scroll-mt-32 rounded-xl border border-border bg-card lg:scroll-mt-40",
        check.error && "border-destructive/60",
        criterion.aiScore === null && blank && "border-danger/40"
      )}
    >
      <div className="flex items-start gap-3 px-4 pt-4 sm:px-5">
        <span
          className="tabular mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-soft-foreground"
          aria-hidden
        >
          {number}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="pt-0.5 text-[0.9375rem] leading-6 font-semibold break-words text-foreground">
            <span className="sr-only">
              {test ? "Question" : "Criterion"} {number}:{" "}
            </span>
            {criterion.title}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {criterion.aiScore !== null ? (
              <span
                className={cn(
                  "tabular inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-medium",
                  demo
                    ? "border border-dashed border-input/50 text-muted-foreground"
                    : "bg-primary-soft text-primary-soft-foreground"
                )}
              >
                {demo ? <FlaskConical className="size-3" aria-hidden /> : <PenLine className="size-3" aria-hidden />}
                {demo ? "Demo suggested" : "AI suggested"} {formatPoints(criterion.aiScore)}
              </span>
            ) : (
              <span className="inline-flex h-6 max-w-full items-center gap-1 rounded-full bg-danger-soft px-2.5 text-xs font-medium text-danger-soft-foreground">
                <CircleAlert className="size-3" aria-hidden />
                No valid AI score
              </span>
            )}
            {edited ? (
              <>
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-secondary px-2.5 text-xs font-medium text-secondary-foreground">
                  <Pencil className="size-3" aria-hidden />
                  Edited
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-7"
                      onClick={onResetScore}
                      aria-label={`Reset ${criterion.title} to the suggested score of ${formatPoints(criterion.aiScore)}`}
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset to {formatPoints(criterion.aiScore)}</TooltipContent>
                </Tooltip>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <Input
            id={inputId}
            type="number"
            inputMode="decimal"
            step={SCORE_STEP}
            min={0}
            max={criterion.maxPoints}
            value={draft.raw}
            placeholder="–"
            onChange={(event) => onScoreChange(event.target.value)}
            // Never let a scroll over a focused field silently change a score.
            onWheel={(event) => event.currentTarget.blur()}
            aria-label={`Score for ${criterion.title}, out of ${criterion.maxPoints}`}
            aria-invalid={check.error ? true : undefined}
            aria-describedby={check.error || blank ? errorId : undefined}
            className={cn(
              "tabular h-11 w-[4.5rem] rounded-full px-3 text-center font-display text-lg font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
              blank && "border-dashed bg-muted/50"
            )}
          />
          <span className="tabular text-sm text-muted-foreground">/ {criterion.maxPoints}</span>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-3 pb-4 sm:px-5 sm:pb-5">
        {check.error ? (
          <p id={errorId} className="flex items-center gap-1.5 text-[0.8125rem] text-danger-soft-foreground">
            <CircleAlert className="size-3.5 shrink-0" aria-hidden />
            {check.error}
          </p>
        ) : blank ? (
          <p id={errorId} className="text-[0.8125rem] text-muted-foreground">
            Enter a score from 0 to {criterion.maxPoints} to return this grade.
          </p>
        ) : null}

        <div>
          <button
            type="button"
            onClick={() => setShowDescription((open) => !open)}
            aria-expanded={showDescription}
            aria-controls={descriptionId}
            className="-mx-2 inline-flex h-8 items-center gap-1 rounded-full px-2 text-[0.8125rem] font-medium text-muted-foreground transition-colors outline-none hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            {criterionGuideLabel(kind)}
            <ChevronDown
              className={cn("size-4 transition-transform", showDescription && "rotate-180")}
              aria-hidden
            />
          </button>
          <p
            id={descriptionId}
            hidden={!showDescription}
            className="mt-1.5 border-l-2 border-border pl-3 text-[0.8125rem] leading-relaxed break-words whitespace-pre-line text-muted-foreground"
          >
            {criterion.description}
          </p>
        </div>

        <EvidenceQuote
          number={number}
          evidence={criterion.aiEvidence}
          verified={evidenceVerified}
          paperNoun={scanned ? "transcription" : "paper"}
          unit={test ? "question" : "criterion"}
          onShow={onShowEvidence}
        />

        <div className="space-y-2">
          <Label htmlFor={commentId} className="text-[0.8125rem]">
            Feedback for student
          </Label>
          <Textarea
            id={commentId}
            value={draft.comment}
            onChange={(event) => onCommentChange(event.target.value)}
            maxLength={MAX_COMMENT_CHARS}
            rows={3}
            placeholder={
              test
                ? "What did this answer get right, and what would earn full credit?"
                : "What did this paper do well, and what would earn full credit?"
            }
            aria-invalid={commentTooLong ? true : undefined}
            className="min-h-20 text-[0.8125rem] leading-relaxed"
          />
          {nearCommentLimit ? (
            <p
              className={cn(
                "tabular text-right text-xs",
                commentTooLong ? "text-danger-soft-foreground" : "text-muted-foreground"
              )}
            >
              {draft.comment.length.toLocaleString()} / {MAX_COMMENT_CHARS.toLocaleString()}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * The quote the grader cited, as a tonal card. A verified quote links to its
 * highlight in the paper (the number chip matches the paper's marks); one
 * that was not found in the paper is shown in red and is not clickable.
 */
function EvidenceQuote({
  number,
  evidence,
  verified,
  paperNoun,
  unit,
  onShow,
}: {
  number: number;
  evidence: string | null;
  verified: boolean;
  paperNoun: "paper" | "transcription";
  unit: "question" | "criterion";
  onShow: () => void;
}) {
  if (!evidence) {
    return <p className="text-[0.8125rem] text-muted-foreground">No quoted evidence for this {unit}.</p>;
  }

  // A quote cut off mid-sentence gets a visual ellipsis. The stored quote is unchanged.
  const ellipsis = quoteIsClipped(evidence) ? "…" : "";

  if (verified) {
    return (
      <button
        type="button"
        onClick={onShow}
        className="group block w-full rounded-xl bg-secondary px-4 py-3 text-left transition-colors outline-none hover:bg-primary-soft/50 focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <span className="mb-1.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success-soft-foreground">
            <span
              aria-hidden
              className="tabular inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-highlight-strong px-1 text-[0.625rem] leading-none font-semibold text-foreground"
            >
              {number}
            </span>
            <CircleCheck className="size-3.5" aria-hidden />
            Verified in {paperNoun}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            Show in {paperNoun}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </span>
        <q className="block text-[0.8125rem] leading-relaxed break-words text-foreground italic">
          {evidence}
          {ellipsis}
        </q>
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-danger-soft/70 px-4 py-3">
      <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-danger-soft-foreground">
        <CircleAlert className="size-3.5" aria-hidden />
        Not found in {paperNoun}
      </span>
      <q className="block text-[0.8125rem] leading-relaxed break-words text-muted-foreground italic">
        {evidence}
        {ellipsis}
      </q>
    </div>
  );
}
