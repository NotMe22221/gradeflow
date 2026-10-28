"use client";

import { useId } from "react";
import { FlaskConical, Info, PenLine, TriangleAlert } from "@/components/icons";

import { ConfidenceBadge } from "@/components/grading/confidence-badge";
import { GraderBadge } from "@/components/grading/grader-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CriterionCard } from "@/components/review/criterion-card";
import { RecheckCallout } from "@/components/review/recheck-callout";
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
 * The grade panel, like the grading side of Classroom's grading tool: the big
 * grade with the suggested score beside it, a one-line demo note, the "Worth
 * rechecking" summary and any flags, then one row per rubric criterion (or
 * test question) with its score field, evidence, and feedback, then the
 * overall note with the grader's draft feedback above it. The action footer
 * is pinned below on desktop.
 */
export function RubricPane({
  item,
  draft,
  summary,
  layout,
  onDraftChange,
  onShowEvidence,
  onShowFlagged,
  onGoToCriterion,
  onShowPhotos,
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
  /** Scroll to a criterion's card and focus its score field (the "Worth rechecking" links). */
  onGoToCriterion: (criterionId: string) => void;
  /** Switch the paper to its photos (a scanned test's "Worth rechecking" handwriting line). */
  onShowPhotos?: () => void;
  /** Desktop action footer, pinned below the scrolling grade panel. */
  footer?: React.ReactNode;
  className?: string;
}) {
  const feedbackId = useId();
  const feedbackHintId = useId();
  const noteHeadingId = useId();
  const fallback = createDraft(item);
  const ai = item.ai;
  // Quotes found in the paper that may not support their criterion (lib/grading/relevance.ts).
  const weakEvidence = new Set(
    (ai?.flags ?? []).flatMap((flag) => (flag.code === "WEAK_EVIDENCE" && flag.criterionId ? [flag.criterionId] : []))
  );
  const summaryInNote = Boolean(ai?.overallComment && draft.feedback.includes(ai.overallComment));
  // Demo output is never called "AI" so nobody mistakes it for a real model.
  const demo = ai?.grader === "demo";
  const unscored = summary.missingIds.length + summary.invalidIds.length;
  const kind = item.assignment.kind;
  const scanned = isScanned(item);
  const paperNoun = paperNounFor(item);
  // A handwritten test is scored by question, an essay by rubric criterion.
  const unit = kind === "TEST" ? { one: "question", many: "questions" } : { one: "criterion", many: "criteria" };
  // The callout says "no suggested score on file" itself; don't say it twice.
  const recheckSaysNoDraft = item.recheck?.reasons.some((reason) => reason.code === "NO_AI_DRAFT") ?? false;

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
      {/* The grade: above the scroller, so it stays in view while the criteria
          scroll on desktop, and a control focused from the keyboard never
          scrolls under it (as it would under a sticky header). `relative`
          keeps its sr-only text inside it. */}
      <div className="relative shrink-0 border-b border-border bg-card px-4 pt-3 pb-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="text-[0.8125rem] font-medium text-muted-foreground">Grade</p>
          {ai ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <ConfidenceBadge confidence={ai.confidence} demo={demo} />
              <GraderBadge grader={ai.grader} model={ai.model} />
            </div>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="flex items-baseline gap-1.5" aria-live="polite">
            <span className="tabular font-display text-[2.125rem] leading-none font-medium text-foreground">
              {formatPoints(summary.total)}
            </span>
            <span className="tabular text-lg text-muted-foreground">/ {formatPoints(summary.maxTotal)}</span>
            <span className="sr-only">points</span>
          </p>
          {summary.aiTotal !== null ? (
            <p className="tabular inline-flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
              {demo ? <FlaskConical className="size-4" aria-hidden /> : <PenLine className="size-4" aria-hidden />}
              {summary.aiTotal === summary.total
                ? `Matches the ${demo ? "demo suggestion" : "suggested score"}`
                : `${demo ? "Demo suggestion" : "Suggested score"} ${formatPoints(summary.aiTotal)}`}
            </p>
          ) : null}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {unscored > 0 ? (
            <span className="font-medium text-warning-soft-foreground">
              {pluralize(unscored, unit.one, unit.many)} still {unscored === 1 ? "needs" : "need"} a valid score
            </span>
          ) : null}
          {ai ? (
            <span>
              {demo
                ? "Demo confidence comes from a rule of thumb, not a model."
                : "Confidence is the model's self-report, uncalibrated."}
            </span>
          ) : null}
        </p>
      </div>

      {/* `relative` keeps sr-only text inside this scroller on desktop. */}
      <div className="relative min-h-0 flex-1 lg:overflow-y-auto lg:overscroll-contain lg:scroll-pb-4">
        <div className="space-y-5 px-4 py-5 sm:px-5">
          {/* One line, not a box, so the scores being approved start near the top of the panel. */}
          {demo ? (
            <p className="flex items-start gap-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
              <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <span className="font-medium text-foreground">Demo grader output:</span> a local heuristic, not real
                AI. Check each score before you return the grade.
              </span>
            </p>
          ) : null}

          {/* The summary first, then the flags it summarizes (which keep their full wording). */}
          <RecheckCallout
            item={item}
            unit={unit}
            flagsBelow={(ai?.flags.length ?? 0) > 0}
            onGoToCriterion={onGoToCriterion}
            onShowPhotos={onShowPhotos}
          />

          {!ai && !recheckSaysNoDraft ? (
            <div className="flex gap-3 rounded-xl bg-secondary p-4 text-[0.875rem] leading-relaxed text-secondary-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>There is no suggested score on file for this paper. Score each {unit.one} yourself.</p>
            </div>
          ) : null}

          {ai && ai.flags.length > 0 ? (
            <FlagsBanner
              item={item}
              paperNoun={paperNoun}
              onShowFlagged={layout.flaggedCount > 0 ? onShowFlagged : null}
            />
          ) : null}

          <section aria-label={kind === "TEST" ? "Questions" : "Rubric"}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-medium text-foreground">{kind === "TEST" ? "Questions" : "Rubric"}</h2>
              <p className="tabular text-xs text-muted-foreground">
                {pluralize(item.criteria.length, unit.one, unit.many)} · {pluralize(summary.maxTotal, "point")}
              </p>
            </div>
            <div className="divide-y divide-border">
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
                    weakEvidence={weakEvidence.has(criterion.id)}
                    onScoreChange={(raw) => updateCriterion(criterion.id, { raw })}
                    onCommentChange={(comment) => updateCriterion(criterion.id, { comment })}
                    onResetScore={() => updateCriterion(criterion.id, { raw: scoreToInput(criterion.aiScore) })}
                    onShowEvidence={() => onShowEvidence(criterion.id)}
                  />
                );
              })}
            </div>
          </section>

          <section aria-labelledby={noteHeadingId} className="space-y-3 border-t border-border pt-5">
            <h2 id={noteHeadingId} className="text-base font-medium text-foreground">
              Overall note
            </h2>

            {/* The grader's summary is a draft: shown above the note it informs, used only if the teacher says so. */}
            {ai?.overallComment ? (
              <div className="rounded-xl bg-secondary px-4 py-3 text-[0.875rem] leading-relaxed break-words text-secondary-foreground">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    {demo ? <FlaskConical className="size-4" aria-hidden /> : <PenLine className="size-4" aria-hidden />}
                    {demo ? "Demo draft feedback" : "Draft feedback"}
                    <span className="sr-only">: </span>
                  </p>
                  <Button
                    type="button"
                    variant="text"
                    size="sm"
                    className="-my-1 -mr-2 h-7 px-2.5"
                    disabled={summaryInNote}
                    onClick={() => {
                      const comment = ai.overallComment ?? "";
                      onDraftChange((current) => ({
                        ...current,
                        feedback: (current.feedback.trim()
                          ? `${current.feedback.trimEnd()}\n\n${comment}`
                          : comment
                        ).slice(0, MAX_FEEDBACK_CHARS),
                      }));
                    }}
                  >
                    {summaryInNote ? "In your note" : "Use in note"}
                  </Button>
                </div>
                {ai.overallComment}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor={feedbackId}>Note to {firstName(item.student.name)}</Label>
              <p id={feedbackHintId} className="text-[0.8125rem] text-muted-foreground">
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
                className="mt-1 min-h-24 text-[0.875rem] leading-relaxed"
              />
            </div>
          </section>
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
          <ul className="list-disc space-y-1.5 pl-4 text-[0.875rem] leading-relaxed break-words text-warning-soft-foreground marker:text-warning">
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
