"use client";

import { useId, useState } from "react";
import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  FlaskConical,
  Pencil,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  return (
    <Card
      id={criterionCardId(submissionId, criterion.id)}
      className={cn(
        "scroll-mt-28 gap-4 p-4 sm:p-5",
        check.error && "border-destructive/50",
        criterion.aiScore === null && blank && "border-danger/30"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="tabular mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground ring-1 ring-border"
          aria-hidden
        >
          {number}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-sm leading-6 font-semibold break-words text-foreground">
            <span className="sr-only">Criterion {number}: </span>
            {criterion.title}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {criterion.aiScore !== null ? (
              <Badge variant="outline" className={cn("tabular", demo && "border-dashed")}>
                {demo ? <FlaskConical aria-hidden /> : <Sparkles aria-hidden />}
                {demo ? "Demo suggested" : "AI suggested"} {formatPoints(criterion.aiScore)}
              </Badge>
            ) : (
              <Badge variant="danger" className="max-w-full whitespace-normal">
                <CircleAlert aria-hidden />
                No valid AI score
              </Badge>
            )}
            {edited ? (
              <>
                <Badge variant="secondary">
                  <Pencil aria-hidden />
                  Edited
                </Badge>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-6"
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
        <div className="flex shrink-0 items-center gap-1.5">
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
              "tabular h-10 w-[4.5rem] text-right text-base font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
              blank && "border-dashed bg-muted/40"
            )}
          />
          <span className="tabular text-sm text-muted-foreground">/ {criterion.maxPoints}</span>
        </div>
      </div>

      {check.error ? (
        <p id={errorId} className="-mt-1 flex items-center gap-1.5 text-[13px] text-danger-soft-foreground">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {check.error}
        </p>
      ) : blank ? (
        <p id={errorId} className="-mt-1 text-[13px] text-muted-foreground">
          Enter a score from 0 to {criterion.maxPoints} to publish.
        </p>
      ) : null}

      <div>
        <button
          type="button"
          onClick={() => setShowDescription((open) => !open)}
          aria-expanded={showDescription}
          aria-controls={descriptionId}
          className="-mx-1 inline-flex items-center gap-1 rounded px-1 text-[13px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <ChevronRight
            className={cn("size-3.5 transition-transform", showDescription && "rotate-90")}
            aria-hidden
          />
          {criterionGuideLabel(kind)}
        </button>
        <p
          id={descriptionId}
          hidden={!showDescription}
          className="mt-2 rounded-lg bg-muted/70 px-3 py-2.5 text-[13px] leading-relaxed break-words whitespace-pre-line text-muted-foreground"
        >
          {criterion.description}
        </p>
      </div>

      <EvidenceQuote
        evidence={criterion.aiEvidence}
        verified={evidenceVerified}
        paperNoun={scanned ? "transcription" : "paper"}
        onShow={onShowEvidence}
      />

      <div className="space-y-2">
        <Label htmlFor={commentId} className="text-[13px]">
          Feedback for student
        </Label>
        <Textarea
          id={commentId}
          value={draft.comment}
          onChange={(event) => onCommentChange(event.target.value)}
          maxLength={MAX_COMMENT_CHARS}
          rows={3}
          placeholder="What did this paper do well, and what would earn full credit?"
          aria-invalid={commentTooLong ? true : undefined}
          className="min-h-20 text-[13px] leading-relaxed"
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
    </Card>
  );
}

function EvidenceQuote({
  evidence,
  verified,
  paperNoun,
  onShow,
}: {
  evidence: string | null;
  verified: boolean;
  paperNoun: "paper" | "transcription";
  onShow: () => void;
}) {
  if (!evidence) {
    return <p className="text-[13px] text-muted-foreground">No quote from the AI for this criterion.</p>;
  }

  // A quote cut off mid-sentence gets a visual ellipsis. The stored quote is unchanged.
  const ellipsis = quoteIsClipped(evidence) ? "…" : "";

  if (verified) {
    return (
      <button
        type="button"
        onClick={onShow}
        className="group block w-full rounded-lg border-l-[3px] border-highlight-strong bg-highlight/35 px-3 py-2.5 text-left transition-colors outline-none hover:bg-highlight/60 focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <span className="mb-1.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success-soft-foreground">
            <CircleCheck className="size-3.5" aria-hidden />
            Verified in {paperNoun}
          </span>
          <span className="text-xs text-muted-foreground transition-colors group-hover:text-foreground">
            Show in {paperNoun}
          </span>
        </span>
        <q className="block text-[13px] leading-relaxed break-words text-foreground italic">
          {evidence}
          {ellipsis}
        </q>
      </button>
    );
  }

  return (
    <div className="rounded-lg border-l-[3px] border-danger/40 bg-danger-soft/60 px-3 py-2.5">
      <span className="mb-1.5 inline-flex items-center gap-1 text-xs font-medium text-danger-soft-foreground">
        <CircleAlert className="size-3.5" aria-hidden />
        Not found in {paperNoun}
      </span>
      <q className="block text-[13px] leading-relaxed break-words text-muted-foreground italic">
        {evidence}
        {ellipsis}
      </q>
    </div>
  );
}
