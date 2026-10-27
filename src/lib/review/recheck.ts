// "Worth rechecking": which drafts in To review most need a careful look,
// worked out from what is already stored. No AI call. The signals are the
// validator's flags on the draft, the quotes it could and couldn't verify,
// the grader's own (uncalibrated) confidence, and how often you changed the
// same grader's score on the same criterion of the same assignment in papers
// you already approved. Never the student's past grades: a draft that differs
// from a student's record is not a reason to doubt it, and saying so would
// invite grading to expectations.
//
// Pure: safe for client components, server code, and unit tests.

import { GRADER_LABELS, parseGraderKind, type GraderKind } from "@/lib/constants";
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

/**
 * One assignment, grader and criterion's approved scores, added up: what
 * summarizeOverrides counts from rows, and what the database's GROUP BY
 * returns (lib/grades/approved-scores.ts).
 */
export type OverrideTotals = {
  assignmentId: string;
  /** As stored (AiGrade.grader). An unknown value counts as the demo grader, as everywhere else. */
  grader: string;
  criterionId: string;
  /** Approved papers with a finite AI score and final score. */
  papers: number;
  /** Of those, the papers changed by OVERRIDE_MIN_CHANGE or more. */
  changed: number;
  /** The sum of those changes, in points (absolute values). */
  change: number;
};

/** Fewer approved papers than this say nothing about how often a score gets changed. */
export const OVERRIDE_MIN_PAPERS = 3;
/** A change smaller than this (in points) is fine-tuning, not a correction. */
export const OVERRIDE_MIN_CHANGE = 1;
/** At or above this share of approved papers changed, a criterion counts as often changed. */
export const OVERRIDE_MIN_SHARE = 0.5;
/** A draft is worth rechecking when its heaviest reason weighs this much: any reason but low confidence alone. */
export const RECHECK_THRESHOLD = 2;

/** Reasons about the whole paper. */
export type PaperRecheckCode = "INJECTION" | "NO_AI_DRAFT" | "LOW_LEGIBILITY" | "LOW_CONFIDENCE";
/** Reasons about one criterion (one question on a test). */
export type CriterionRecheckCode = "UNSCORED" | "NO_QUOTE" | "WEAK_QUOTE" | "OFTEN_CHANGED";
export type RecheckReasonCode = PaperRecheckCode | CriterionRecheckCode;

/**
 * How much each reason counts toward the order. The heaviest reason on a
 * paper decides its place; the sum of its distinct reasons (each counted
 * once, however many criteria it names) only breaks ties. So no pile of
 * routine reasons ever outranks a heavier one, such as text addressed to the
 * grader or a paper with no AI draft.
 */
export const RECHECK_WEIGHTS: Record<RecheckReasonCode, number> = {
  INJECTION: 5,
  NO_AI_DRAFT: 4,
  UNSCORED: 3,
  LOW_LEGIBILITY: 3,
  NO_QUOTE: 2,
  WEAK_QUOTE: 2,
  OFTEN_CHANGED: 2,
  LOW_CONFIDENCE: 1,
};

/**
 * One reason, as a full teacher-facing sentence (`text`, which never echoes
 * the paper) plus the structured parts a UI needs to say it another way
 * without editing the sentence.
 */
export type RecheckReason =
  | { code: PaperRecheckCode; criterionId: null; criterionTitle: null; text: string }
  | {
      code: Exclude<CriterionRecheckCode, "OFTEN_CHANGED">;
      criterionId: string;
      /** The criterion's (or question's) title, as in the rubric. */
      criterionTitle: string;
      text: string;
    }
  | {
      code: "OFTEN_CHANGED";
      criterionId: string;
      criterionTitle: string;
      text: string;
      /** The numbers in `text`: describeOverride words them. */
      override: CriterionOverride;
    };

export type Recheck = {
  /** The heaviest reason's weight: the To review order. */
  top: number;
  /** Sum of the weights of the distinct reason codes present: breaks ties in `top`. */
  score: number;
  /** top >= RECHECK_THRESHOLD. */
  worth: boolean;
  /** Every reason, paper-level reasons first, then by criterion order. */
  reasons: RecheckReason[];
};

const NO_RECHECK: Recheck = { top: 0, score: 0, worth: false, reasons: [] };

/**
 * Per-criterion change rates from added-up totals. Totals for the same
 * assignment, criterion and grader (after an unknown grader is read as the
 * demo grader) are added together. A group with no papers is left out.
 */
export function historyFromTotals(totals: readonly OverrideTotals[]): OverrideHistory {
  const merged = new Map<string, OverrideTotals & { grader: GraderKind }>();
  for (const total of totals) {
    if (!(total.papers > 0) || !Number.isFinite(total.changed) || !Number.isFinite(total.change)) continue;
    const grader = parseGraderKind(total.grader);
    const key = `${total.assignmentId}\u0000${grader}\u0000${total.criterionId}`;
    const sum = merged.get(key);
    if (sum) {
      sum.papers += total.papers;
      sum.changed += total.changed;
      sum.change += total.change;
    } else {
      merged.set(key, { ...total, grader });
    }
  }
  const history: OverrideHistory = {};
  for (const { assignmentId, grader, criterionId, papers, changed, change } of merged.values()) {
    const byGrader = (history[assignmentId] ??= {});
    const byCriterion = (byGrader[grader] ??= {});
    byCriterion[criterionId] = { papers, changed, meanChange: changed ? change / changed : 0 };
  }
  return history;
}

/** Group approved papers' scores into per-criterion change rates. Rows with a non-finite score are skipped. */
export function summarizeOverrides(rows: readonly ApprovedScoreRow[]): OverrideHistory {
  const totals = new Map<string, OverrideTotals>();
  for (const row of rows) {
    if (!Number.isFinite(row.aiScore) || !Number.isFinite(row.finalScore)) continue;
    const key = `${row.assignmentId}\u0000${row.grader}\u0000${row.criterionId}`;
    const total = totals.get(key) ?? {
      assignmentId: row.assignmentId,
      grader: row.grader,
      criterionId: row.criterionId,
      papers: 0,
      changed: 0,
      change: 0,
    };
    const change = Math.abs(row.finalScore - row.aiScore);
    total.papers += 1;
    if (change >= OVERRIDE_MIN_CHANGE) {
      total.changed += 1;
      total.change += change;
    }
    totals.set(key, total);
  }
  return historyFromTotals([...totals.values()]);
}

/** True when approved papers show this criterion's score is usually corrected. */
export function isOftenChanged(override: CriterionOverride | undefined): override is CriterionOverride {
  return Boolean(
    override && override.papers >= OVERRIDE_MIN_PAPERS && override.changed / override.papers >= OVERRIDE_MIN_SHARE
  );
}

/** "1 point", "1.5 points": a change in points, rounded to the half point and worded on the rounded value. */
export function changeLabel(points: number): string {
  const rounded = Math.round(points * 2) / 2;
  return `${formatPoints(rounded)} ${rounded === 1 ? "point" : "points"}`;
}

/** The grader as a sentence names it: "the demo grader" (never "AI"), else the engine's label ("Claude"). */
export function graderName(grader: GraderKind): string {
  return grader === "demo" ? "the demo grader" : GRADER_LABELS[grader];
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The "often changed" sentence: "You changed the demo grader's "Voice" score
 * on 3 of 4 approved papers, by 1.5 points on average." Without a title it
 * reads "...the demo grader's score on...", for a line that already names
 * the criterion.
 */
export function describeOverride(grader: GraderKind, override: CriterionOverride, criterionTitle?: string): string {
  const score = criterionTitle === undefined ? "score" : `"${criterionTitle}" score`;
  return `You changed ${graderName(grader)}'s ${score} on ${override.changed} of ${override.papers} approved papers, by ${changeLabel(override.meanChange)} on average.`;
}

/** Why this draft is worth a careful look, from stored data only. */
export function recheckFor(item: ReviewItem, history: OverrideHistory): Recheck {
  const test = item.assignment.kind === "TEST";
  const reasons: RecheckReason[] = [];
  const paper = (code: PaperRecheckCode, text: string) =>
    reasons.push({ code, criterionId: null, criterionTitle: null, text });

  if (!item.ai) {
    paper(
      "NO_AI_DRAFT",
      test
        ? "There is no suggested score on file for this test: score each question from the answer key."
        : "There is no suggested score on file for this paper: score each criterion from the rubric."
    );
    return finish(reasons);
  }

  const { flags, grader } = item.ai;
  const demo = grader === "demo";
  if (flags.some((flag) => flag.code === "POSSIBLE_PROMPT_INJECTION")) {
    paper("INJECTION", "Text in the paper is addressed to the grader.");
  }
  const legibility = flags.find((flag) => flag.code === "LOW_LEGIBILITY");
  if (legibility) {
    // The camera grader capped its confidence for the same reason, so a low-confidence line would only repeat this.
    const photo = item.images.length > 1 ? "photos" : "photo";
    paper(
      "LOW_LEGIBILITY",
      // Flags stored before they carried the level say it in words.
      (legibility.legibility ?? (/^Most of the handwriting/.test(legibility.message) ? "illegible" : "partly_legible")) ===
        "illegible"
        ? `Most of the handwriting could not be read: check every answer against the ${photo}.`
        : `Some of the handwriting was hard to read: check the answers against the ${photo}.`
    );
  } else if (item.ai.confidence === "low") {
    paper(
      "LOW_CONFIDENCE",
      demo
        ? "The demo grader's confidence is low. That comes from a rule of thumb, not a measured accuracy."
        : `${GRADER_LABELS[grader]} rated its own confidence low. That is its guess, not a measured accuracy.`
    );
  }

  const overrides = history[item.assignment.id]?.[grader] ?? {};
  const weak = new Set(flags.filter((flag) => flag.code === "WEAK_EVIDENCE").map((flag) => flag.criterionId));

  for (const criterion of item.criteria) {
    const about = { criterionId: criterion.id, criterionTitle: criterion.title };
    const title = `"${criterion.title}"`;
    if (criterion.aiScore === null) {
      const text = `${capitalize(graderName(grader))} gave no usable ${title} score, so it needs one from you.`;
      reasons.push({ code: "UNSCORED", ...about, text });
      continue;
    }
    // A blank answer on a test is scored 0 because the grader quoted nothing: the expected draft, not a quote
    // problem. A 0 whose quote was dropped (not in the answers, or addressed to the grader) still counts, and so
    // does a flag stored before it said why (no `evidence`).
    const blankAnswer =
      test &&
      criterion.aiScore === 0 &&
      flags.some(
        (flag) => flag.code === "EVIDENCE_NOT_FOUND" && flag.criterionId === criterion.id && flag.evidence === "none"
      );
    if (!criterion.evidenceFound) {
      if (!blankAnswer) {
        const text = `No supporting quote was found in the ${test ? "answers" : "paper"} for ${title}.`;
        reasons.push({ code: "NO_QUOTE", ...about, text });
      }
    } else if (weak.has(criterion.id)) {
      reasons.push({ code: "WEAK_QUOTE", ...about, text: `The quote for ${title} may not support that criterion.` });
    }
    const override = overrides[criterion.id];
    if (isOftenChanged(override)) {
      const text = describeOverride(grader, override, criterion.title);
      reasons.push({ code: "OFTEN_CHANGED", ...about, text, override: { ...override } });
    }
  }
  return finish(reasons);
}

function finish(reasons: RecheckReason[]): Recheck {
  if (reasons.length === 0) return NO_RECHECK;
  const weights = [...new Set(reasons.map((reason) => reason.code))].map((code) => RECHECK_WEIGHTS[code]);
  const top = Math.max(...weights);
  const score = weights.reduce((sum, weight) => sum + weight, 0);
  return { top, score, worth: top >= RECHECK_THRESHOLD, reasons };
}
