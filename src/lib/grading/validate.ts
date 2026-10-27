// Validation of grader output before it touches the database. Pure: safe for
// unit tests. Nothing a grader returns is trusted: every score is range
// checked against the rubric, every quote is checked against the paper, and
// anything that fails becomes a flag the teacher sees in the review queue.

import { isConfidence, type Confidence } from "@/lib/constants";
import { formatPoints, pluralize, wordCount } from "@/lib/format";
import { cleanEvidence, findEvidenceSpan, type EvidenceLocator } from "@/lib/grading/evidence";
import { detectPromptInjection, isGraderDirected } from "@/lib/grading/injection";
import { quoteRelevance } from "@/lib/grading/relevance";
import type {
  GradingInput,
  RawGradingResult,
  RubricCriterionInput,
  ValidatedCriterion,
  ValidatedGrading,
  ValidationFlag,
} from "@/lib/grading/types";

/** A criterion title for use inside a sentence: no trailing sentence punctuation. */
function quotedTitle(title: string): string {
  return title.trim().replace(/[.?!:;]+$/, "");
}

/** A grading failure whose message is safe to show to a teacher. */
export class GradingError extends Error {
  constructor(
    message: string,
    /** HTTP status the route handler should answer with. */
    readonly status: number = 502
  ) {
    super(message);
    this.name = "GradingError";
  }
}

export const SHORT_PAPER_WORDS = 80;
export const MAX_JUSTIFICATION_CHARS = 600;
export const MAX_EVIDENCE_CHARS = 400;
export const MAX_OVERALL_COMMENT_CHARS = 600;
const SCORE_EPSILON = 1e-9;

/** Trim and cap at a word boundary. */
function capText(value: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Cap a quote without adding characters, so a prefix of a found quote is still found. */
function capQuote(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function shortQuote(text: string, max = 80): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

function validateScore(
  value: unknown,
  criterion: RubricCriterionInput,
  flags: ValidationFlag[]
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    flags.push({
      code: "SCORE_OUT_OF_RANGE",
      criterionId: criterion.id,
      message: `AI returned an unusable score for "${quotedTitle(criterion.title)}". Enter a score yourself.`,
    });
    return null;
  }
  if (value < -SCORE_EPSILON || value > criterion.maxPoints + SCORE_EPSILON) {
    flags.push({
      code: "SCORE_OUT_OF_RANGE",
      criterionId: criterion.id,
      message: `AI suggested ${formatPoints(value)} of ${formatPoints(criterion.maxPoints)} points for "${quotedTitle(criterion.title)}". Enter a score yourself.`,
    });
    return null;
  }
  const rounded = Math.round(value * 2) / 2;
  // Rounding can never leave the range, but clamp for float noise and -0.
  return Math.min(criterion.maxPoints, Math.max(0, rounded)) + 0;
}

const NO_QUOTE = { evidence: null, evidenceFound: false } as const;

/**
 * Keep a quote only if it appears in the paper word for word, and store it as
 * the paper's own text. Anything else is dropped (the teacher sees "No
 * supporting quote found") and flagged. Ignored when matching:
 * - whitespace and letter case;
 * - curly vs straight quote marks and dash style;
 * - quote marks or an ellipsis around the quote;
 * - a final period.
 * A kept quote that may not fit its criterion is flagged as a weak match
 * (relevance.ts) when `topic` is given.
 */
function validateEvidence(
  value: unknown,
  criterion: RubricCriterionInput,
  paper: string,
  flags: ValidationFlag[],
  locate: EvidenceLocator,
  topic: string | null
): { evidence: string | null; evidenceFound: boolean } {
  const title = quotedTitle(criterion.title);
  const claimed = capQuote(cleanEvidence(asString(value)), MAX_EVIDENCE_CHARS);
  if (!claimed) {
    flags.push({
      code: "EVIDENCE_NOT_FOUND",
      criterionId: criterion.id,
      message: `No supporting quote found for "${title}": the AI did not quote the paper.`,
      evidence: "none",
    });
    return NO_QUOTE;
  }
  const span = locate(paper, claimed);
  if (!span) {
    flags.push({
      code: "EVIDENCE_NOT_FOUND",
      criterionId: criterion.id,
      message: `No supporting quote found for "${title}": the AI's quote ("${shortQuote(claimed, 60)}") is not in the paper word for word, so it was dropped.`,
      evidence: "not_in_paper",
    });
    return NO_QUOTE;
  }
  const evidence = paper.slice(span.start, span.end);
  if (isGraderDirected(evidence)) {
    // Text addressed to the grader is never evidence for anything.
    flags.push({
      code: "EVIDENCE_NOT_FOUND",
      criterionId: criterion.id,
      message: `No supporting quote found for "${title}": the AI quoted text addressed to the grader, so it was dropped.`,
      evidence: "grader_directed",
    });
    return NO_QUOTE;
  }
  if (topic !== null && !quoteRelevance(evidence, criterion, topic).relevant) {
    flags.push({
      code: "WEAK_EVIDENCE",
      criterionId: criterion.id,
      message: `The quote for "${title}" may not support this criterion: it shares no key words or cues with it. Check it against the paper.`,
    });
  }
  return { evidence, evidenceFound: true };
}

export type ValidateOptions = {
  /**
   * Flag quotes that may not fit their criterion (relevance.ts). On by
   * default; off for a test, whose quotes are short answers.
   */
  checkRelevance?: boolean;
};

/**
 * Validate raw grader output against the rubric and the paper. `locate`
 * decides whether a quote appears in the paper: verbatim by default; tests
 * also accept a short answer that is a whole answer line (findTestEvidenceSpan).
 */
export function validateGrading(
  raw: RawGradingResult,
  input: GradingInput,
  locate: EvidenceLocator = findEvidenceSpan,
  { checkRelevance = true }: ValidateOptions = {}
): ValidatedGrading {
  const topic = checkRelevance ? `${input.assignmentTitle} ${input.instructions}` : null;
  const paperFlags: ValidationFlag[] = [];
  const criterionFlags: ValidationFlag[] = [];
  const trailingFlags: ValidationFlag[] = [];

  const injection = detectPromptInjection(input.paper);
  if (injection.found) {
    paperFlags.push({
      code: "POSSIBLE_PROMPT_INJECTION",
      message: `The paper contains text addressed to the grader ("${shortQuote(injection.snippets[0])}"). It was treated as paper content only, never as instructions. Check the scores before approving.`,
    });
  }

  const words = wordCount(input.paper);
  if (words < SHORT_PAPER_WORDS) {
    paperFlags.push({
      code: "SHORT_PAPER",
      message: `This paper is only ${pluralize(words, "word")} long, which is too short to grade reliably.`,
    });
  }

  const rawCriteria: unknown[] = Array.isArray(raw?.criteria) ? raw.criteria : [];
  if (!Array.isArray(raw?.criteria)) {
    paperFlags.push({
      code: "INVALID_OUTPUT",
      message: "The AI response had no criterion scores. Score each criterion yourself.",
    });
  }

  const rubricIds = new Set(input.criteria.map((criterion) => criterion.id));
  const byId = new Map<string, Record<string, unknown>>();
  const unknownIds = new Set<string>();
  for (const item of rawCriteria) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = asString(record.criterionId).trim();
    if (!rubricIds.has(id)) {
      unknownIds.add(id);
      continue;
    }
    // Duplicate ids: the first result wins.
    if (!byId.has(id)) byId.set(id, record);
  }

  const criteria: ValidatedCriterion[] = input.criteria.map((criterion) => {
    const result = byId.get(criterion.id);
    if (!result) {
      criterionFlags.push({
        code: "MISSING_CRITERION",
        criterionId: criterion.id,
        message: `The AI did not score "${quotedTitle(criterion.title)}". Enter a score yourself.`,
      });
      // No placeholder text: the justification pre-fills the student-facing
      // comment, and the MISSING_CRITERION flag already explains the gap.
      return {
        criterionId: criterion.id,
        aiScore: null,
        justification: "",
        evidence: null,
        evidenceFound: false,
      };
    }
    const aiScore = validateScore(result.score, criterion, criterionFlags);
    const justification = capText(asString(result.justification), MAX_JUSTIFICATION_CHARS);
    const { evidence, evidenceFound } = validateEvidence(
      result.evidence,
      criterion,
      input.paper,
      criterionFlags,
      locate,
      topic
    );
    return { criterionId: criterion.id, aiScore, justification, evidence, evidenceFound };
  });

  if (unknownIds.size > 0) {
    trailingFlags.push({
      code: "UNKNOWN_CRITERION",
      message:
        unknownIds.size === 1
          ? "The AI returned a score for a criterion that is not in this rubric. It was ignored."
          : `The AI returned scores for ${unknownIds.size} criteria that are not in this rubric. They were ignored.`,
    });
  }

  let confidence: Confidence = "low";
  const rawConfidence = asString(raw?.confidence).trim().toLowerCase();
  if (isConfidence(rawConfidence)) {
    confidence = rawConfidence;
  } else {
    paperFlags.push({
      code: "INVALID_OUTPUT",
      message: "The AI returned an unreadable confidence level, so it is shown as low.",
    });
  }

  return {
    criteria,
    confidence,
    overallComment: capText(asString(raw?.overallComment), MAX_OVERALL_COMMENT_CHARS),
    flags: [...paperFlags, ...criterionFlags, ...trailingFlags],
  };
}
