"use client";

import { useId, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  FlaskConical,
  RotateCcw,
  PenLine,
} from "@/components/icons";

import { MARK_CHIP } from "@/components/review/paper-sheet";
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

/**
 * One rubric criterion (or test question) in the grade panel: the score
 * field beside the title, the suggested score in plain words, the guide or
 * answer key, the cited evidence, and the feedback the student will read.
 * Rows are separated by dividers in the panel rather than boxed, so the
 * scores carry the visual weight.
 */
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
  const draftNoteId = useId();
  const inputId = scoreInputId(submissionId, criterion.id);

  const check = checkScore(draft.raw, criterion.maxPoints);
  const blank = !check.error && check.value === null;
  const edited =
    criterion.aiScore !== null && (check.error !== null || check.value !== criterion.aiScore);
  const commentTooLong = draft.comment.length > MAX_COMMENT_CHARS;
  const nearCommentLimit = draft.comment.length > MAX_COMMENT_CHARS - 200;
  const demo = grader === "demo";
  const test = kind === "TEST";
  // The feedback field starts with the grader's draft; say so until the teacher changes it.
  const draftFeedback =
    criterion.finalComment === null &&
    Boolean(criterion.aiJustification) &&
    draft.comment === criterion.aiJustification;

  return (
    <div id={criterionCardId(submissionId, criterion.id)} className="scroll-mt-32 py-5 lg:scroll-mt-40">
      <div className="flex items-start gap-3">
        <span
          className="tabular mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
          aria-hidden
        >
          {number}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="pt-0.5 text-[0.9375rem] leading-6 font-semibold break-words text-foreground">
            <span className="sr-only">
              {test ? "Question" : "Criterion"} {number}:{" "}
            </span>
            {criterion.title}
          </h3>
          <div className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem]">
            {criterion.aiScore !== null ? (
              <span className="tabular inline-flex items-center gap-1.5 text-muted-foreground">
                {demo ? <FlaskConical className="size-4" aria-hidden /> : <PenLine className="size-4" aria-hidden />}
                {demo ? "Demo suggestion" : "Suggested score"} {formatPoints(criterion.aiScore)}
              </span>
            ) : (
              <span className="inline-flex max-w-full items-center gap-1.5 font-medium text-danger-soft-foreground">
                <CircleAlert className="size-4 shrink-0" aria-hidden />
                No suggested score: enter one
              </span>
            )}
            {edited ? (
              <>
                <span aria-hidden className="text-muted-foreground">
                  ·
                </span>
                <span className="font-medium text-foreground">Edited</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="-my-1 size-7"
                      onClick={onResetScore}
                      aria-label={`Reset ${criterion.title} to the suggested score of ${formatPoints(criterion.aiScore)}`}
                    >
                      <RotateCcw className="size-4" />
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

      <div className="mt-3 space-y-4 sm:pl-10">
        {check.error ? (
          <p id={errorId} className="flex items-center gap-1.5 text-[0.8125rem] text-danger-soft-foreground">
            <CircleAlert className="size-4 shrink-0" aria-hidden />
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
              className={cn("size-4 transition-transform motion-reduce:transition-none", showDescription && "rotate-180")}
              aria-hidden
            />
          </button>
          <p
            id={descriptionId}
            hidden={!showDescription}
            className="mt-1.5 border-l-2 border-border pl-3 text-[0.875rem] leading-relaxed break-words whitespace-pre-line text-muted-foreground"
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
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Label htmlFor={commentId} className="text-[0.8125rem]">
              Feedback for student
            </Label>
            {draftFeedback ? (
              <span
                id={draftNoteId}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"
              >
                {demo ? <FlaskConical className="size-3.5" aria-hidden /> : <PenLine className="size-3.5" aria-hidden />}
                {demo ? "Demo draft feedback, edit before returning" : "Draft feedback, edit before returning"}
              </span>
            ) : null}
          </div>
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
            aria-describedby={draftFeedback ? draftNoteId : undefined}
            className="min-h-20 text-[0.875rem] leading-relaxed"
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
 * The quote the grader cited. A verified quote links to its highlight in the
 * paper (the number chip matches the paper's marks); one that was not found
 * in the paper says so in words and is not clickable.
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
        <span className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary-foreground">
            <span
              aria-hidden
              className={cn(
                "tabular inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] leading-none font-semibold",
                MARK_CHIP,
                // The chip matches the light highlight on the paper sheet in both themes.
                "dark:bg-[color-mix(in_oklab,var(--warning)_78%,var(--paper))]"
              )}
            >
              {number}
            </span>
            <CircleCheck className="size-4 text-success" aria-hidden />
            Found in {paperNoun}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            Show in {paperNoun}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden
            />
          </span>
        </span>
        <q className="block text-[0.875rem] leading-relaxed break-words text-foreground italic">
          {evidence}
          {ellipsis}
        </q>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-danger/50 px-4 py-3">
      <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-danger-soft-foreground">
        <CircleAlert className="size-4" aria-hidden />
        Not found in {paperNoun}
      </span>
      <q className="block text-[0.875rem] leading-relaxed break-words text-muted-foreground italic">
        {evidence}
        {ellipsis}
      </q>
    </div>
  );
}
