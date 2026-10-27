// "AI vs your grades": on one assignment's approved papers, how the AI's
// stored draft scores compare with the scores you approved. Stored scores
// only, no AI call. The rates come from the evaluation metrics
// (lib/eval/metrics.ts: your final score is the "human" score, the AI's is the
// "model" score), and the per-criterion "how often you changed it" numbers come
// from recheck.ts, so they match the reasons To review gives.
//
// One grader at a time: papers drafted by different graders (the demo grader,
// then Claude) are not mixed. The grader with the most papers is shown and the
// others are named as left out.
//
// Pure: safe for client components, server code, and unit tests.

import { GRADERS, type GraderKind } from "@/lib/constants";
import { summarize, type ScorePair } from "@/lib/eval/metrics";
import { isOftenChanged, summarizeOverrides, type CriterionOverride } from "@/lib/review/recheck";

/** The card's "Average change" wording: the same function To review's reasons use (recheck.ts). */
export { changeLabel } from "@/lib/review/recheck";

/** One approved paper's stored scores on one criterion. */
export type AgreementScoreRow = {
  submissionId: string;
  /** The engine that drafted the paper (AiGrade.grader). */
  grader: GraderKind;
  criterionId: string;
  /** null when the AI's score failed validation and was discarded. */
  aiScore: number | null;
  /** The approved (published) score. */
  finalScore: number;
};

/** A rubric criterion, in rubric order. */
export type AgreementCriterionInput = { id: string; title: string };

/** Below this many approved papers the numbers are a rough check, not a measured accuracy. */
export const AGREEMENT_SMALL_SAMPLE = 30;

export type CriterionAgreement = {
  id: string;
  title: string;
  /** Approved papers with a final score for this criterion, and how many of them the AI scored. */
  pairs: number;
  scored: number;
  /** Fractions of the scored papers (0 to 1), or null when the AI scored none. */
  exact: number | null;
  within1: number | null;
  /** Mean absolute difference in points, or null when the AI scored none. */
  meanDifference: number | null;
  /**
   * How often you changed the AI's score by OVERRIDE_MIN_CHANGE or more
   * (summarizeOverrides), or null when the AI scored none.
   */
  override: CriterionOverride | null;
  /** isOftenChanged(override): the same test as To review's "you changed ... score" reason. */
  oftenChanged: boolean;
};

export type GraderPapers = { grader: GraderKind; papers: number };

export type AiAgreement = {
  /** The grader whose drafts are compared. */
  grader: GraderKind;
  /** Approved papers drafted by that grader: the sample size N. */
  papers: number;
  /** papers < AGREEMENT_SMALL_SAMPLE. */
  smallSample: boolean;
  /** Criterion scores compared, and how many of them the AI gave a usable score for. */
  pairs: number;
  scored: number;
  /** Over every scored criterion score: fractions (0 to 1), or null when none were scored. */
  exact: number | null;
  within1: number | null;
  /** Mean absolute difference in points, or null when none were scored. */
  meanDifference: number | null;
  /** In rubric order. */
  criteria: CriterionAgreement[];
  /** Other graders' approved papers, not counted above. Most papers first. */
  leftOut: GraderPapers[];
};

/** Any key works: summarizeOverrides groups by assignment, and these rows are all one assignment's. */
const ASSIGNMENT_KEY = "assignment";

/** Papers per grader, most first; on a tie a real AI engine before the demo grader. */
export function papersByGrader(rows: readonly AgreementScoreRow[]): GraderPapers[] {
  const papers = new Map<GraderKind, Set<string>>();
  for (const row of rows) {
    const ids = papers.get(row.grader) ?? new Set<string>();
    ids.add(row.submissionId);
    papers.set(row.grader, ids);
  }
  return [...papers.entries()]
    .map(([grader, ids]) => ({ grader, papers: ids.size }))
    .sort((a, b) => b.papers - a.papers || GRADERS.indexOf(a.grader) - GRADERS.indexOf(b.grader));
}

/**
 * Compare the AI's stored scores with the approved ones, for the grader with
 * the most approved papers. Rows for criteria not in `criteria` (or with a
 * non-finite final score) are ignored. Returns null when no approved paper has
 * a comparable score yet.
 */
export function summarizeAgreement(
  criteria: readonly AgreementCriterionInput[],
  rows: readonly AgreementScoreRow[]
): AiAgreement | null {
  const known = new Set(criteria.map((criterion) => criterion.id));
  const usable = rows.filter(
    (row) =>
      known.has(row.criterionId) &&
      Number.isFinite(row.finalScore) &&
      (row.aiScore === null || Number.isFinite(row.aiScore))
  );
  const [chosen, ...others] = papersByGrader(usable);
  if (!chosen) return null;

  const own = usable.filter((row) => row.grader === chosen.grader);
  // Keyed by criterion id (two criteria may share a title); titles are put back below.
  const pairs: ScorePair[] = own.map((row) => ({
    essayId: row.submissionId,
    criterion: row.criterionId,
    human: row.finalScore,
    model: row.aiScore,
  }));
  const summary = summarize(
    pairs,
    criteria.map((criterion) => criterion.id),
    0
  );
  const overrides =
    summarizeOverrides(
      own.flatMap((row) =>
        row.aiScore === null
          ? []
          : [
              {
                assignmentId: ASSIGNMENT_KEY,
                grader: row.grader,
                criterionId: row.criterionId,
                aiScore: row.aiScore,
                finalScore: row.finalScore,
              },
            ]
      )
    )[ASSIGNMENT_KEY]?.[chosen.grader] ?? {};

  return {
    grader: chosen.grader,
    papers: summary.essays,
    smallSample: summary.essays < AGREEMENT_SMALL_SAMPLE,
    pairs: summary.pairs,
    scored: summary.scored,
    exact: summary.exact,
    within1: summary.within1,
    meanDifference: summary.mae,
    criteria: criteria.map((criterion, index) => {
      const row = summary.perCriterion[index];
      const override = overrides[criterion.id] ?? null;
      return {
        id: criterion.id,
        title: criterion.title,
        pairs: row?.pairs ?? 0,
        scored: row?.scored ?? 0,
        exact: row?.exact ?? null,
        within1: row?.within1 ?? null,
        meanDifference: row?.mae ?? null,
        override,
        oftenChanged: isOftenChanged(override ?? undefined),
      };
    }),
    leftOut: others,
  };
}
