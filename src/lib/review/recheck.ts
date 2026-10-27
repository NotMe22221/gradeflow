// "Worth rechecking": which drafts in To review most need a careful look,
// worked out from what is already stored. No AI call. The signals are the
// validator's flags on the draft, the quotes it could and couldn't verify,
// the model's own (uncalibrated) confidence, and how often you changed the
// same grader's score on the same criterion of the same assignment in papers
// you already approved. Never the student's past grades: a draft that differs
// from a student's record is not a reason to doubt it, and saying so would
// invite grading to expectations.
//
// Pure: safe for client components, server code, and unit tests.

import { GRADER_LABELS, type GraderKind } from "@/lib/constants";
import { formatPoints } from "@/lib/format";
import type { ReviewItem } from "@/lib/review/types";

/** How often the teacher changed one grader's score on one criterion, over approved papers. */
export type CriterionOverride = {
  /** Approved papers with both an AI score and a final score for this criterion. */
  papers: number;
  /** Of those, papers where the final score differs from the AI's by OVERRIDE_MIN_CHANGE or more. */
  changed: number;
  /** Mean absolute change in points over the changed papers (0 when none changed). */
  meanChange: number;
};

/** assignmentId -> grader -> criterionId -> how often its score was changed. */
export type OverrideHistory = Record<string, Partial<Record<GraderKind, Record<string, CriterionOverride>>>>;

/** One approved paper's AI and final score on one criterion, as stored. */
export type ApprovedScoreRow = {
  assignmentId: string;
  grader: GraderKind;
  criterionId: string;
  aiScore: number;
  finalScore: number;
};

/** Fewer approved papers than this say nothing about how often a score gets changed. */
export const OVERRIDE_MIN_PAPERS = 3;
/** A change smaller than this (in points) is fine-tuning, not a correction. */
export const OVERRIDE_MIN_CHANGE = 1;
/** At or above this share of approved papers changed, a criterion counts as often changed. */
export const OVERRIDE_MIN_SHARE = 0.5;
/** A draft is worth rechecking at this score or more: any one reason except low confidence alone. */
export const RECHECK_THRESHOLD = 2;

export type RecheckReasonCode =
  | "INJECTION"
  | "NO_AI_DRAFT"
  | "UNSCORED"
  | "NO_QUOTE"
  | "WEAK_QUOTE"
  | "OFTEN_CHANGED"
  | "LOW_CONFIDENCE";

/** How much each reason counts toward the order. Each is shown as a plain sentence. */
export const RECHECK_WEIGHTS: Record<RecheckReasonCode, number> = {
  INJECTION: 5,
  NO_AI_DRAFT: 4,
  UNSCORED: 3,
  NO_QUOTE: 2,
  WEAK_QUOTE: 2,
  OFTEN_CHANGED: 2,
  LOW_CONFIDENCE: 1,
};

export type RecheckReason = {
  code: RecheckReasonCode;
  /** The criterion it is about, or null for the whole paper. */
  criterionId: string | null;
  /** The teacher-facing sentence. Never echoes the paper's text. */
  text: string;
};

export type Recheck = {
  /** Sum of the reasons' weights: the To review order. */
  score: number;
  /** score >= RECHECK_THRESHOLD. */
  worth: boolean;
  /** Paper-level reasons first, then by criterion order. */
  reasons: RecheckReason[];
};

const NO_RECHECK: Recheck = { score: 0, worth: false, reasons: [] };

/** Group approved papers' scores into per-criterion change rates. */
export function summarizeOverrides(rows: readonly ApprovedScoreRow[]): OverrideHistory {
  const totals = new Map<string, { row: ApprovedScoreRow; papers: number; changed: number; change: number }>();
  for (const row of rows) {
    if (!Number.isFinite(row.aiScore) || !Number.isFinite(row.finalScore)) continue;
    const key = `${row.assignmentId}\u0000${row.grader}\u0000${row.criterionId}`;
    const total = totals.get(key) ?? { row, papers: 0, changed: 0, change: 0 };
    const change = Math.abs(row.finalScore - row.aiScore);
    total.papers += 1;
    if (change >= OVERRIDE_MIN_CHANGE) {
      total.changed += 1;
      total.change += change;
    }
    totals.set(key, total);
  }
  const history: OverrideHistory = {};
  for (const { row, papers, changed, change } of totals.values()) {
    const byGrader = (history[row.assignmentId] ??= {});
    const byCriterion = (byGrader[row.grader] ??= {});
    byCriterion[row.criterionId] = { papers, changed, meanChange: changed ? change / changed : 0 };
  }
  return history;
}

/** True when approved papers show this criterion's score is usually corrected. */
export function isOftenChanged(override: CriterionOverride | undefined): override is CriterionOverride {
  return Boolean(
    override && override.papers >= OVERRIDE_MIN_PAPERS && override.changed / override.papers >= OVERRIDE_MIN_SHARE
  );
}

function pointsLabel(value: number): string {
  return `${formatPoints(Math.round(value * 2) / 2)} ${value === 1 ? "point" : "points"}`;
}

/** Why this draft is worth a careful look, from stored data only. */
export function recheckFor(item: ReviewItem, history: OverrideHistory): Recheck {
  const reasons: RecheckReason[] = [];
  const add = (code: RecheckReasonCode, criterionId: string | null, text: string) =>
    reasons.push({ code, criterionId, text });

  if (!item.ai) {
    add("NO_AI_DRAFT", null, "There is no AI draft for this paper: score it from the rubric.");
    return finish(reasons);
  }

  const flags = item.ai.flags;
  if (flags.some((flag) => flag.code === "POSSIBLE_PROMPT_INJECTION")) {
    add("INJECTION", null, "Text in the paper is addressed to the grader.");
  }
  if (item.ai.confidence === "low") {
    add("LOW_CONFIDENCE", null, "The model rated its own confidence low. That is its guess, not a measured accuracy.");
  }

  const grader = item.ai.grader;
  const graderName = grader === "demo" ? "the demo grader" : GRADER_LABELS[grader];
  const overrides = history[item.assignment.id]?.[grader] ?? {};
  const weak = new Set(flags.filter((flag) => flag.code === "WEAK_EVIDENCE").map((flag) => flag.criterionId));

  for (const criterion of item.criteria) {
    const title = `"${criterion.title}"`;
    if (criterion.aiScore === null) {
      add("UNSCORED", criterion.id, `The AI gave no usable ${title} score, so it needs one from you.`);
      continue;
    }
    if (!criterion.evidenceFound) {
      add("NO_QUOTE", criterion.id, `No supporting quote was found in the paper for ${title}.`);
    } else if (weak.has(criterion.id)) {
      add("WEAK_QUOTE", criterion.id, `The quote for ${title} may not support that criterion.`);
    }
    const override = overrides[criterion.id];
    if (isOftenChanged(override)) {
      add(
        "OFTEN_CHANGED",
        criterion.id,
        `You changed ${graderName}'s ${title} score on ${override.changed} of ${override.papers} approved papers, by ${pointsLabel(override.meanChange)} on average.`
      );
    }
  }
  return finish(reasons);
}

function finish(reasons: RecheckReason[]): Recheck {
  if (reasons.length === 0) return NO_RECHECK;
  const score = reasons.reduce((sum, reason) => sum + RECHECK_WEIGHTS[reason.code], 0);
  return { score, worth: score >= RECHECK_THRESHOLD, reasons };
}
