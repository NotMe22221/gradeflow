"use client";

import { useId } from "react";
import { FlaskConical, Info, Sparkles, TriangleAlert } from "lucide-react";

import { ConfidenceBadge } from "@/components/grading/confidence-badge";
import { GraderBadge } from "@/components/grading/grader-badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CriterionCard } from "@/components/review/criterion-card";
import { firstName, formatPoints, pluralize } from "@/lib/format";
import { describeFlag } from "@/lib/grading/flags";
import { isScanned, paperNounFor } from "@/lib/review/media";
import {
  MAX_FEEDBACK_CHARS,
  createDraft,
  scoreToInput,
  type DraftSummary,
  type EvidenceLayout,
  type ItemDraft,
} from "@/lib/review/model";
import type { ReviewItem } from "@/lib/review/types";
import { cn } from "@/lib/utils";

/**
 * The grade panel, like the right side of Classroom's grading tool: the big
 * grade with the AI suggestion beside it, then one card per rubric criterion
 * (or test question) with its score field, evidence, and feedback, then the
 * overall note. The action footer is pinned below on desktop.
 */
export function RubricPane({
  item,
  draft,
  summary,
  layout,
  onDraftChange,
  onShowEvidence,
  onShowFlagged,
  footer,
  className,
}: {
  item: ReviewItem;
  draft: ItemDraft;
  summary: DraftSummary;
  layout: EvidenceLayout;
  onDraftChange: (update: (draft: ItemDraft) => ItemDraft) => void;
  onShowEvidence: (criterionId: string) => void;
  /** Scroll the paper to the first passage addressed to the grader. */
  onShowFlagged: () => void;
  /** Desktop action footer, pinned below the scrolling grade panel. */
  footer?: React.ReactNode;
  className?: string;
}) {
  const feedbackId = useId();
  const feedbackHintId = useId();
  const fallback = createDraft(item);
  const ai = item.ai;
  // Demo output is never called "AI" so nobody mistakes it for a real model.
  const demo = ai?.grader === "demo";
  const source = demo ? "Demo grader" : "AI";
  const unscored = summary.missingIds.length + summary.invalidIds.length;
  const kind = item.assignment.kind;
  const scanned = isScanned(item);
  const paperNoun = paperNounFor(item);
  // A handwritten test is scored by question, an essay by rubric criterion.
  const unit = kind === "TEST" ? { one: "question", many: "questions" } : { one: "criterion", many: "criteria" };

  const updateCriterion = (criterionId: string, patch: Partial<ItemDraft["scores"][string]>) =>
    onDraftChange((current) => ({
      ...current,
      scores: {
        ...current.scores,
        [criterionId]: { ...(current.scores[criterionId] ?? fallback.scores[criterionId]), ...patch },
      },
    }));

  return (
    <div className={cn("flex min-h-0 flex-col bg-card", className)}>
      {/* `relative` keeps sr-only text inside this scroller on desktop. */}
      <div className="relative min-h-0 flex-1 lg:overflow-y-auto lg:overscroll-contain">
        {/* The grade: pinned while the criteria scroll on desktop. */}
        <div className="z-10 border-b border-border bg-card px-4 pt-3 pb-4 sm:px-5 lg:sticky lg:top-0">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <p className="text-[13px] font-medium text-muted-foreground">Grade</p>
            {ai ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <ConfidenceBadge confidence={ai.confidence} />
                <GraderBadge grader={ai.grader} model={ai.model} />
              </div>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="flex items-baseline gap-1.5" aria-live="polite">
              <span className="tabular font-display text-[34px] leading-none font-medium text-foreground">
                {formatPoints(summary.total)}
              </span>
              <span className="tabular text-lg text-muted-foreground">/ {formatPoints(summary.maxTotal)}</span>
              <span className="sr-only">points</span>
            </p>
            {summary.aiTotal !== null ? (
              <span
                className={cn(
                  "tabular inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium",
                  demo
                    ? "border border-dashed border-input/50 text-muted-foreground"
                    : "bg-primary-soft text-primary-soft-foreground"
                )}
              >
                {demo ? <FlaskConical className="size-3.5" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
                {summary.aiTotal === summary.total
                  ? `Matches the ${demo ? "demo" : "AI"} suggestion`
                  : `${demo ? "Demo" : "AI"} suggested ${formatPoints(summary.aiTotal)}`}
              </span>
            ) : null}
          </div>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {unscored > 0 ? (
              <span className="font-medium text-warning-soft-foreground">
                {pluralize(unscored, unit.one, unit.many)} still {unscored === 1 ? "needs" : "need"} a valid score
              </span>
            ) : null}
            {ai ? <span>Confidence is the model&apos;s self-report, uncalibrated.</span> : null}
          </p>
        </div>

        <div className="space-y-4 px-4 py-5 sm:px-5">
          {demo ? (
            <div className="flex gap-3 rounded-xl border border-dashed border-input/50 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
              <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>
                <span className="font-medium text-foreground">Demo grader output.</span> These scores and quotes
                come from a local heuristic, not real AI. Check each one before you return the grade.
              </p>
            </div>
          ) : null}

          {!ai ? (
            <div className="flex gap-3 rounded-xl bg-secondary p-4 text-[13px] leading-relaxed text-secondary-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>There is no AI suggestion on file for this paper. Score each {unit.one} yourself.</p>
            </div>
          ) : null}

          {ai && ai.flags.length > 0 ? (
            <FlagsBanner
              item={item}
              paperNoun={paperNoun}
              onShowFlagged={layout.flaggedCount > 0 ? onShowFlagged : null}
            />
          ) : null}

          {ai?.overallComment ? (
            <div className="rounded-xl bg-secondary px-4 py-3 text-[13px] leading-relaxed break-words text-secondary-foreground">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
                {demo ? <FlaskConical className="size-3.5" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
                {source} summary
                <span className="sr-only">: </span>
              </p>
              {ai.overallComment}
            </div>
          ) : null}

          <section aria-label={kind === "TEST" ? "Questions" : "Rubric"} className="space-y-3 pt-1">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-medium text-foreground">{kind === "TEST" ? "Questions" : "Rubric"}</h2>
              <p className="tabular text-xs text-muted-foreground">
                {pluralize(item.criteria.length, unit.one, unit.many)} · {pluralize(summary.maxTotal, "point")}
              </p>
            </div>
            {item.criteria.map((criterion, index) => {
              const entry = draft.scores[criterion.id] ?? fallback.scores[criterion.id];
              return (
                <CriterionCard
                  key={criterion.id}
                  submissionId={item.id}
                  criterion={criterion}
                  number={index + 1}
                  draft={entry}
                  grader={ai?.grader ?? null}
                  kind={kind}
                  scanned={scanned}
                  evidenceVerified={layout.markForCriterion[criterion.id] !== undefined}
                  onScoreChange={(raw) => updateCriterion(criterion.id, { raw })}
                  onCommentChange={(comment) => updateCriterion(criterion.id, { comment })}
                  onResetScore={() => updateCriterion(criterion.id, { raw: scoreToInput(criterion.aiScore) })}
                  onShowEvidence={() => onShowEvidence(criterion.id)}
                />
              );
            })}
          </section>

          <div className="space-y-2 rounded-xl border border-border p-4 sm:p-5">
            <Label htmlFor={feedbackId}>Overall note to student</Label>
            <p id={feedbackHintId} className="text-[13px] text-muted-foreground">
              Optional. {firstName(item.student.name)} sees it with the returned grade.
            </p>
            <Textarea
              id={feedbackId}
              value={draft.feedback}
              onChange={(event) => {
                const feedback = event.target.value;
                onDraftChange((current) => ({ ...current, feedback }));
              }}
              maxLength={MAX_FEEDBACK_CHARS}
              rows={4}
              aria-describedby={feedbackHintId}
              placeholder="A sentence or two on the paper as a whole."
              className="mt-1 min-h-24 text-[13px] leading-relaxed"
            />
          </div>
        </div>
      </div>
      {footer}
    </div>
  );
}

function FlagsBanner({
  item,
  paperNoun,
  onShowFlagged,
}: {
  item: ReviewItem;
  /** "transcription" on a scanned test, matching the criterion cards. */
  paperNoun: "paper" | "transcription";
  /** Present when the flagged text is marked in the paper. */
  onShowFlagged: (() => void) | null;
}) {
  const flags = item.ai?.flags ?? [];
  const seen = new Set<string>();
  const lines = flags
    .map((flag) => ({
      ...describeFlag(flag, item.criteria),
      injection: flag.code === "POSSIBLE_PROMPT_INJECTION",
    }))
    .filter((line) => {
      const key = `${line.criterionLabel ?? ""}|${line.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return (
    <div role="note" className="rounded-xl bg-warning-soft p-4">
      <div className="flex gap-3">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-soft-foreground" aria-hidden />
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-warning-soft-foreground">Check before you return this grade</p>
          <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed break-words text-warning-soft-foreground marker:text-warning">
            {lines.map((line, index) => (
              <li key={index}>
                {line.criterionLabel ? <span className="font-medium">{line.criterionLabel}: </span> : null}
                {line.message}
                {line.injection && onShowFlagged ? (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={onShowFlagged}
                      className="rounded font-medium whitespace-nowrap underline underline-offset-2 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
                    >
                      Show in {paperNoun}
                    </button>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
