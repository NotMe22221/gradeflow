// Which kind of quality a rubric criterion measures (thesis, evidence,
// organization, a lab report's method...), judged from its wording. Shared by
// the demo grader and the quote relevance check. Pure: safe for client
// components, server code, and unit tests.

import type { RubricCriterionInput } from "@/lib/grading/types";

export type EssayDimension = "thesis" | "evidence" | "organization" | "mechanics" | "analysis" | "counterargument";
export type LabDimension = "hypothesis" | "method" | "results" | "limitations";
export type Dimension = EssayDimension | LabDimension | "general";

export const DIMENSION_PATTERNS: Array<[Exclude<Dimension, "general">, RegExp]> = [
  ["counterargument", /counter|opposing|rebut|objection|other side|alternative (?:view|perspective)/],
  ["hypothesis", /hypothes|predict|testable|research question/],
  ["method", /method|procedure|materials|experimental design|sampling/],
  ["results", /\bresults?\b|measurements?|observations|findings/],
  ["limitations", /sources? of error|error analysis|experimental error|limitations?|uncertaint/],
  ["evidence", /evidence|support|example|source|citation|cite|data|research|quot|detail|textual/],
  ["thesis", /thesis|claim|argument|position|main idea|focus|purpose|central idea|controlling idea|stance/],
  ["organization", /organi[sz]|structure|flow|transition|paragraph|coheren|order|sequence|introduction|conclusion/],
  ["analysis", /analy|reasoning|explain|explanation|insight|interpret|critical|depth|connect|reflect|understanding|significance/],
  ["mechanics", /grammar|mechanic|spelling|punctuation|convention|style|clarity|language|word choice|voice|tone|sentence|fluency|proofread|usage/],
];

export const LAB_DIMENSIONS: ReadonlySet<Dimension> = new Set<LabDimension>(["hypothesis", "method", "results", "limitations"]);
// Essay dimensions whose words also turn up in lab-report titles ("Data and
// results", "Conclusion and sources of error", "Clarity of procedure"). A lab
// dimension named in the same title takes precedence over these.
const YIELDS_TO_LAB: ReadonlySet<Dimension> = new Set<EssayDimension>(["evidence", "thesis", "organization", "mechanics"]);

/** Which kind of quality a criterion measures, judged from its title first. */
export function classifyCriterion(criterion: Pick<RubricCriterionInput, "title" | "description">): Dimension {
  const title = criterion.title.toLowerCase();
  let best: Dimension = "general";
  let bestIndex = Number.POSITIVE_INFINITY;
  let bestLab: Dimension | null = null;
  let bestLabIndex = Number.POSITIVE_INFINITY;
  for (const [dimension, pattern] of DIMENSION_PATTERNS) {
    const index = title.search(pattern);
    if (index === -1) continue;
    if (index < bestIndex) {
      best = dimension;
      bestIndex = index;
    }
    if (LAB_DIMENSIONS.has(dimension) && index < bestLabIndex) {
      bestLab = dimension;
      bestLabIndex = index;
    }
  }
  if (bestLab && YIELDS_TO_LAB.has(best)) return bestLab;
  if (best !== "general") return best;

  const description = criterion.description.toLowerCase();
  let bestCount = 0;
  for (const [dimension, pattern] of DIMENSION_PATTERNS) {
    const count = description.match(new RegExp(pattern.source, "g"))?.length ?? 0;
    if (count > bestCount) {
      best = dimension;
      bestCount = count;
    }
  }
  return best;
}
