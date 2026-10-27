// The judges' try-it sandbox (/try): limits, the grading input for a pasted
// paper, and the result the page shows. Pure: safe for client components,
// server code, and unit tests. The database side is sandbox.ts.

import { RUBRIC_TEMPLATES, TEMPLATE_IDS, type TemplateId } from "@/lib/demo/templates";
import { wordCount } from "@/lib/format";
import type { GradingInput, ValidatedGrading, ValidationFlag } from "@/lib/grading/types";

/** A short paper: about 1,300 words at most. */
export const TRY_MAX_CHARS = 8_000;
export const TRY_MIN_WORDS = 20;
/** How long a pasted paper and its result are kept. */
export const TRY_TTL_HOURS = 24;
/**
 * New runs a sandbox, and a network, may save in any hour, whichever engine
 * grades. These bound what the public sandbox can write; live AI calls are
 * capped separately by the usage guard.
 */
export const TRY_RUNS_PER_SANDBOX_HOUR = 30;
export const TRY_RUNS_PER_NETWORK_HOUR = 120;

/** The sandbox's own run cap was reached: the route answers 429 with Retry-After. */
export class SandboxLimitError extends Error {
  readonly status = 429;
  constructor(
    readonly retryAfterSeconds: number,
    scope: "sandbox" | "network"
  ) {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    super(
      scope === "sandbox"
        ? `You've graded ${TRY_RUNS_PER_SANDBOX_HOUR} papers here in the last hour. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
        : `Your network has graded ${TRY_RUNS_PER_NETWORK_HOUR} papers here in the last hour. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
    );
    this.name = "SandboxLimitError";
  }
}

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === "string" && (TEMPLATE_IDS as readonly string[]).includes(value);
}

export function checkTryPaper(text: string): { ok: true; paper: string } | { ok: false; error: string } {
  const paper = text.replace(/\r\n?/g, "\n").trim();
  if (!paper) return { ok: false, error: "Paste a paper first." };
  if (paper.length > TRY_MAX_CHARS) {
    return { ok: false, error: `Keep the paper under ${TRY_MAX_CHARS.toLocaleString("en-US")} characters.` };
  }
  if (wordCount(paper) < TRY_MIN_WORDS) return { ok: false, error: `Paste at least ${TRY_MIN_WORDS} words.` };
  return { ok: true, paper };
}

/** The grading input for a pasted paper under one of the built-in rubric templates. */
export function tryItInput(templateId: TemplateId, paper: string): GradingInput {
  const template = RUBRIC_TEMPLATES.find((candidate) => candidate.id === templateId) ?? RUBRIC_TEMPLATES[0];
  return {
    assignmentTitle: template.title,
    instructions: template.instructions,
    criteria: template.criteria.map((criterion, index) => ({ id: `c${index + 1}`, ...criterion })),
    paper,
  };
}

export type TryItEngine = { kind: "claude" | "demo"; model: string | null };

export type TryItCriterion = {
  id: string;
  title: string;
  maxPoints: number;
  score: number | null;
  justification: string;
  /** The quote exactly as it appears in the paper, or null: "No supporting quote found". */
  evidence: string | null;
  evidenceFound: boolean;
  /** The quote is in the paper but may not fit the criterion (a WEAK_EVIDENCE flag). */
  weak: boolean;
};

export type TryItResult = {
  id: string;
  templateId: TemplateId;
  rubricName: string;
  paper: string;
  engine: TryItEngine;
  confidence: ValidatedGrading["confidence"];
  overallComment: string;
  flags: ValidationFlag[];
  criteria: TryItCriterion[];
  /** Null when any criterion has no valid score. */
  total: number | null;
  maxTotal: number;
  /** ISO times. */
  createdAt: string;
  expiresAt: string;
  /** The same paper and rubric were already graded in this sandbox: shown again, no new call. */
  reused: boolean;
};

/** What the page says about the engine and the caps. */
export type TryItAllowance = {
  engine: TryItEngine;
  killSwitch: boolean;
  /** Live calls this visitor can still make now; null when the demo grader runs (free, uncapped). */
  remaining: number | null;
  perSessionPerHour: number;
  perIpPerHour: number;
  perDay: number;
};

/** The page's view of a validated first pass. */
export function toTryItResult(args: {
  id: string;
  templateId: TemplateId;
  paper: string;
  engine: TryItEngine;
  grading: ValidatedGrading;
  createdAt: Date;
  expiresAt: Date;
  reused: boolean;
}): TryItResult {
  const input = tryItInput(args.templateId, args.paper);
  const template = RUBRIC_TEMPLATES.find((candidate) => candidate.id === args.templateId) ?? RUBRIC_TEMPLATES[0];
  const weak = new Set(args.grading.flags.flatMap((flag) => (flag.code === "WEAK_EVIDENCE" && flag.criterionId ? [flag.criterionId] : [])));
  const criteria = input.criteria.map((criterion) => {
    const graded = args.grading.criteria.find((candidate) => candidate.criterionId === criterion.id);
    return {
      id: criterion.id,
      title: criterion.title,
      maxPoints: criterion.maxPoints,
      score: graded?.aiScore ?? null,
      justification: graded?.justification ?? "",
      evidence: graded?.evidenceFound ? graded.evidence : null,
      evidenceFound: graded?.evidenceFound ?? false,
      weak: weak.has(criterion.id),
    };
  });
  return {
    id: args.id,
    templateId: args.templateId,
    rubricName: template.name,
    paper: args.paper,
    engine: args.engine,
    confidence: args.grading.confidence,
    overallComment: args.grading.overallComment,
    flags: args.grading.flags,
    criteria,
    total: criteria.every((criterion) => criterion.score !== null)
      ? criteria.reduce((sum, criterion) => sum + (criterion.score ?? 0), 0)
      : null,
    maxTotal: criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0),
    createdAt: args.createdAt.toISOString(),
    expiresAt: args.expiresAt.toISOString(),
    reused: args.reused,
  };
}
