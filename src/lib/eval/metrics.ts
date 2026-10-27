// Agreement between a grader's scores and human scores, for the evaluation
// harness (scripts/eval/run-eval.ts) and the evidence page. Pure: safe for
// client components, server code, and unit tests.

/** One essay's score on one criterion: the human score and the grader's (null when it gave none). */
export type ScorePair = { essayId: string; criterion: string; human: number; model: number | null };

export type CriterionSummary = {
  criterion: string;
  /** Pairs for this criterion, and how many the grader scored. */
  pairs: number;
  scored: number;
  /** Fractions of the scored pairs (0 to 1), or null when none were scored. */
  exact: number | null;
  within1: number | null;
  /** Mean absolute difference in points, or null when none were scored. */
  mae: number | null;
  meanHuman: number;
  meanModel: number | null;
};

export type Disagreement = ScorePair & { model: number; difference: number };

export type EvalSummary = {
  essays: number;
  pairs: number;
  scored: number;
  exact: number | null;
  within1: number | null;
  mae: number | null;
  perCriterion: CriterionSummary[];
  /** The largest differences, biggest first. */
  largest: Disagreement[];
};

// Scores come in half points, so "the same score" means closer than a quarter point.
const SAME = 0.25;
const EPSILON = 1e-9;

function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function summarizePairs(pairs: ScorePair[]) {
  const scored = pairs.filter((pair): pair is ScorePair & { model: number } => pair.model !== null);
  const differences = scored.map((pair) => Math.abs(pair.model - pair.human));
  return {
    pairs: pairs.length,
    scored: scored.length,
    exact: scored.length ? differences.filter((d) => d < SAME).length / scored.length : null,
    within1: scored.length ? differences.filter((d) => d <= 1 + EPSILON).length / scored.length : null,
    mae: mean(differences),
    meanModel: mean(scored.map((pair) => pair.model)),
  };
}

/**
 * Exact agreement, agreement within one point, and mean absolute error,
 * overall and per criterion (in `criteria` order), plus the largest
 * disagreements. A pair the grader didn't score counts in `pairs` but not in
 * the rates: the summary reports how many were scored.
 */
export function summarize(pairs: ScorePair[], criteria: readonly string[], largestCount = 8): EvalSummary {
  const all = summarizePairs(pairs);
  const perCriterion = criteria.map((criterion) => {
    const own = pairs.filter((pair) => pair.criterion === criterion);
    const { meanModel, ...rest } = summarizePairs(own);
    return { criterion, ...rest, meanHuman: mean(own.map((pair) => pair.human)) ?? 0, meanModel };
  });
  const largest = pairs
    .filter((pair): pair is ScorePair & { model: number } => pair.model !== null)
    .map((pair) => ({ ...pair, difference: pair.model - pair.human }))
    .filter((pair) => Math.abs(pair.difference) >= SAME)
    .sort(
      (a, b) =>
        Math.abs(b.difference) - Math.abs(a.difference) ||
        a.essayId.localeCompare(b.essayId) ||
        a.criterion.localeCompare(b.criterion)
    )
    .slice(0, largestCount);
  return {
    essays: new Set(pairs.map((pair) => pair.essayId)).size,
    pairs: all.pairs,
    scored: all.scored,
    exact: all.exact,
    within1: all.within1,
    mae: all.mae,
    perCriterion,
    largest,
  };
}

/** The same pairs with every grader score replaced by `value`: a baseline any grader should beat. */
export function constantBaseline(pairs: ScorePair[], value: number): ScorePair[] {
  return pairs.map((pair) => ({ ...pair, model: value }));
}

export function formatRate(value: number | null): string {
  return value === null ? "–" : `${Math.round(value * 100)}%`;
}

export function formatPointsDiff(value: number | null): string {
  return value === null ? "–" : value.toFixed(2);
}

export type BaselineVerdict = "beats" | "matches" | "trails";

/**
 * How a grader's mean absolute error compares with the always-3 baseline on
 * the same pairs. Within a twentieth of a point counts as the same: on a
 * sample this small, a smaller gap means nothing.
 */
export function baselineVerdict(summary: EvalSummary, baseline: EvalSummary): BaselineVerdict | null {
  if (summary.mae === null || baseline.mae === null) return null;
  const gap = baseline.mae - summary.mae;
  if (Math.abs(gap) < 0.05) return "matches";
  return gap > 0 ? "beats" : "trails";
}
