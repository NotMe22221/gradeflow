"use client";

import { useId } from "react";
import { FlaskConical, Info, TriangleAlert } from "lucide-react";

import { ConfidenceBadge } from "@/components/grading/confidence-badge";
import { GraderBadge } from "@/components/grading/grader-badge";
import { Card } from "@/components/ui/card";
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
  /** Desktop action footer, pinned below the scrolling rubric. */
  footer?: React.ReactNode;
  className?: string;
}) {
  const feedbackId = useId();
  const feedbackHintId = useId();
  const fallback = createDraft(item);
  const ai = item.ai;
  // Demo output is never called "AI" so nobody mistakes it for a real model.
  const source = ai?.grader === "demo" ? "Demo grader" : "AI";
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
    <div className={cn("flex min-h-0 flex-col bg-background", className)}>
      {/* `relative` keeps sr-only text inside this scroller on desktop. */}
      <div className="relative min-h-0 flex-1 lg:overflow-y-auto lg:overscroll-contain">
        {/* Running total: pinned while the rubric scrolls on desktop. */}
        <div className="z-10 border-b border-border bg-card/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-6 lg:sticky lg:top-0">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-muted-foreground">Running total</p>
              <p className="mt-0.5 flex items-baseline gap-1.5" aria-live="polite">
                <span className="tabular text-3xl font-semibold tracking-tight text-foreground">
                  {formatPoints(summary.total)}
                </span>
                <span className="tabular text-lg font-medium text-muted-foreground">
                  / {formatPoints(summary.maxTotal)}
                </span>
                <span className="sr-only">points</span>
              </p>
              <p className="mt-1 flex min-h-4 flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {summary.aiTotal !== null && summary.aiTotal !== summary.total ? (
                  <span className="tabular">
                    {source} suggested {formatPoints(summary.aiTotal)}
                  </span>
                ) : summary.aiTotal !== null ? (
                  <span>Matches the {source === "AI" ? "AI" : "demo"} suggestion</span>
                ) : null}
                {unscored > 0 ? (
                  <span className="text-warning-soft-foreground">
                    {pluralize(unscored, unit.one, unit.many)} still {unscored === 1 ? "needs" : "need"} a valid
                    score
                  </span>
                ) : null}
              </p>
            </div>
            {ai ? (
              <div className="flex flex-col items-start gap-1.5 sm:items-end">
                <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                  <ConfidenceBadge confidence={ai.confidence} />
                  <GraderBadge grader={ai.grader} model={ai.model} />
                </div>
                <p className="text-xs text-muted-foreground">Self-reported, uncalibrated</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 px-4 py-5 sm:px-6">
          {ai?.grader === "demo" ? (
            <div className="flex gap-3 rounded-xl border border-dashed border-border bg-muted/50 p-4 text-[13px] leading-relaxed text-muted-foreground">
              <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>
                <span className="font-medium text-foreground">Demo grader output.</span> These scores and quotes
                come from a local heuristic, not real AI. Check each one before you publish.
              </p>
            </div>
          ) : null}

          {!ai ? (
            <div className="flex gap-3 rounded-xl border border-border bg-muted/50 p-4 text-[13px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>There is no AI suggestion on file for this paper. Score each {unit.one} yourself.</p>
            </div>
          ) : null}

          {ai?.overallComment ? (
            <p className="text-[13px] leading-relaxed break-words text-muted-foreground">
              <span className="font-medium text-foreground">{source} summary</span>
              <span aria-hidden> · </span>
              <span className="sr-only">: </span>
              {ai.overallComment}
            </p>
          ) : null}

          {ai && ai.flags.length > 0 ? (
            <FlagsBanner
              item={item}
              paperNoun={paperNoun}
              onShowFlagged={layout.flaggedCount > 0 ? onShowFlagged : null}
            />
          ) : null}

          <section aria-label={kind === "TEST" ? "Questions" : "Rubric"} className="space-y-4">
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

          <Card className="gap-2 p-4 sm:p-5">
            <Label htmlFor={feedbackId}>Overall note to student</Label>
            <p id={feedbackHintId} className="text-[13px] text-muted-foreground">
              Optional. {firstName(item.student.name)} sees it with the published grade.
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
          </Card>
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
    <div role="note" className="rounded-xl border border-warning/30 bg-warning-soft p-4">
      <div className="flex gap-3">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-soft-foreground" aria-hidden />
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-warning-soft-foreground">Check before you publish</p>
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
