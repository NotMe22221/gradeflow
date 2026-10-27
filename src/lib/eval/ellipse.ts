// The ELLIPSE evaluation: the rubric the essays are graded against, the
// grading input for one essay, and the shape of a results file. Pure: safe for
// client components, server code, and unit tests. Data and license:
// eval/data/README.md.

import type { EvalSummary, ScorePair } from "@/lib/eval/metrics";
import type { GradingInput, RubricCriterionInput } from "@/lib/grading/types";

export type EllipseEssay = {
  id: string;
  band: string;
  prompt: string;
  text: string;
  scores: Record<EllipseCriterionId, number>;
};

export const ELLIPSE_CRITERIA = [
  {
    id: "overall",
    title: "Overall proficiency",
    description:
      "How well the essay communicates as a whole. Score 1 when it is very hard to follow, 3 for a typical essay that gets its ideas across with noticeable problems, 5 for clear, fluent, well-developed writing with only minor slips.",
  },
  {
    id: "cohesion",
    title: "Cohesion",
    description:
      "How the ideas connect: paragraphing, logical order, and transitions and references that link sentences and ideas. Score 1 when ideas are disconnected, 5 when they flow logically throughout.",
  },
  {
    id: "syntax",
    title: "Syntax",
    description:
      "Sentence structure: the variety and control of simple, compound and complex sentences. Score 1 for very limited or broken sentences, 5 for varied, well-controlled ones.",
  },
  {
    id: "vocabulary",
    title: "Vocabulary",
    description:
      "The range and precision of word choice. Score 1 for very basic or misused words that obscure meaning, 5 for a wide, precise vocabulary used appropriately.",
  },
  {
    id: "phraseology",
    title: "Phraseology",
    description:
      "Natural multi-word expressions: collocations, idioms and set phrases. Score 1 when phrases are often unnatural or wrong, 5 when phrasing is natural and idiomatic.",
  },
  {
    id: "grammar",
    title: "Grammar",
    description:
      "Grammatical accuracy: verb tense and form, agreement, articles, and word forms. Score 1 for frequent errors that obscure meaning, 5 for very few errors.",
  },
  {
    id: "conventions",
    title: "Conventions",
    description:
      "Spelling, capitalization and punctuation. Score 1 for frequent errors that distract or confuse, 5 for very few errors.",
  },
] as const;

export type EllipseCriterionId = (typeof ELLIPSE_CRITERIA)[number]["id"];

export const ELLIPSE_CRITERION_IDS: readonly EllipseCriterionId[] = ELLIPSE_CRITERIA.map((criterion) => criterion.id);

/** The rubric as grader input: each criterion out of 5, as in the corpus (which scores 1 to 5). */
export const ELLIPSE_RUBRIC: RubricCriterionInput[] = ELLIPSE_CRITERIA.map(({ id, title, description }) => ({
  id,
  title,
  description,
  maxPoints: 5,
}));

/**
 * Grading input for one essay. The rubric and the scale are the same for
 * every essay, so an essay's prompt is the only per-essay instruction.
 */
export function ellipseGradingInput(essay: Pick<EllipseEssay, "prompt" | "text">): GradingInput {
  return {
    assignmentTitle: `Essay: ${essay.prompt}`,
    instructions: `Write an essay in response to the prompt "${essay.prompt}". The writers are English language learners in grades 8 to 12. Score every criterion from 1 to 5 in half points, as the descriptions say.`,
    criteria: ELLIPSE_RUBRIC,
    paper: essay.text,
  };
}

export type EvalRun = {
  grader: "demo" | "claude";
  model: string | null;
  effort: string | null;
  /** How the run must be described wherever it is shown. */
  label: string;
  /** ISO date the run finished. */
  ranAt: string;
  /** Paid API calls made, and results reused from the harness's local cache. */
  calls: number;
  cachedResults: number;
  failedEssays: number;
  inputTokens: number;
  outputTokens: number;
  /** From list prices (src/lib/ai/pricing.ts): an estimate, not a bill. */
  estimatedCostUsd: number;
};

export type EvalResults = {
  version: 1;
  dataset: { name: string; license: string; source: string; sample: string; essays: number };
  run: EvalRun;
  criteria: { id: string; title: string }[];
  summary: EvalSummary;
  /** The same pairs scored by always answering 3: what a grader has to beat. */
  baseline: EvalSummary;
  pairs: ScorePair[];
};

/** eval/results/live.json before anyone has run the live evaluation. */
export type NoEvalRun = { version: 1; run: null; note: string };
