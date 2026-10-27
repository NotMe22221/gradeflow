// The Claude API grader. Pure apart from the network call it is handed: the
// client, the usage guard and the cache are injected (src/lib/grading/claude.ts
// wires the real ones), so tests stub the provider at this boundary and no
// test ever calls the paid API.
//
// Output is shaped by structured outputs, then validated again by
// validate.ts before anything is stored.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

import { worstCaseCostMicroUsd } from "@/lib/ai/pricing";
import { AiLimitError, type AiFeature, type UsageGuard } from "@/lib/ai/usage";
import {
  gradeCacheKey,
  paperHash,
  promptHash,
  rubricHash,
  type GradeCacheKeyParts,
  type GradeCacheStore,
} from "@/lib/grading/cache";
import { buildGradingSystemPrompt, buildGradingUserMessage } from "@/lib/grading/prompt";
import type { Grader, GradingInput, RawGradingResult } from "@/lib/grading/types";
import { GradingError } from "@/lib/grading/validate";

export const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;
export type Effort = (typeof EFFORT_LEVELS)[number];

/** ANTHROPIC_EFFORT, or medium (the default on Claude Haiku 5.5 and Opus 5.5). */
export function parseEffort(value: string | undefined): Effort {
  const normalized = value?.trim().toLowerCase() ?? "";
  return (EFFORT_LEVELS as readonly string[]).includes(normalized) ? (normalized as Effort) : "medium";
}

/**
 * Models that accept the server-side refusal fallback. Claude Haiku 5.5 has
 * none (a declined request stays declined), so it is sent without one.
 */
const SERVER_FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

export function supportsServerFallback(model: string): boolean {
  return SERVER_FALLBACK_MODELS.has(model);
}

/**
 * Room for adaptive thinking plus the JSON for a rubric of a dozen criteria.
 * It also bounds what one call can cost (the reservation in the usage guard).
 */
export const CLAUDE_MAX_TOKENS = 8_000;

/**
 * How long one grading call may wait: `timeout` per attempt, one retry, and
 * `deadlineMs` for the whole call, retries included, so it always ends before
 * the grade route's 120 s maxDuration.
 */
export const CLAUDE_REQUEST_BUDGET = { timeout: 60_000, maxRetries: 1, deadlineMs: 110_000 } as const;

/** Bump when the request format changes in a way the prompt text doesn't show. */
const REQUEST_FORMAT_VERSION = 1;

// Kept deliberately simple (no numeric bounds): validate.ts enforces ranges
// against the rubric and flags anything out of bounds for the teacher.
const GradingOutputSchema = z.object({
  criteria: z.array(
    z.object({
      criterion_id: z.string().describe("The id attribute of the rubric criterion being scored."),
      score: z.number().describe("Points awarded, from 0 to the criterion's max points, in steps of 0.5."),
      justification: z.string().describe("One or two sentences explaining the score."),
      evidence: z.string().describe("8 to 30 consecutive words copied exactly from the student paper."),
    })
  ),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Uncalibrated self-assessment of how clearly the paper maps onto the rubric."),
  overall_comment: z.string().describe("One or two sentences: the main strength and the most important improvement."),
});

/** The one SDK method the grader uses: the boundary tests stub. */
export type ClaudeParseClient = { beta: { messages: Pick<Anthropic["beta"]["messages"], "parse"> } };

/** Where a first pass for this input, model and effort is saved (cache.ts). */
export function claudeCacheKey(input: GradingInput, model: string, effort: Effort): { key: string; parts: GradeCacheKeyParts } {
  const parts = {
    paperHash: paperHash(input.paper),
    rubricHash: rubricHash(input),
    model,
    promptHash: promptHash([REQUEST_FORMAT_VERSION, buildGradingSystemPrompt(), effort, CLAUDE_MAX_TOKENS]),
  };
  return { key: gradeCacheKey(parts), parts };
}

export function buildClaudeGradingRequest(input: GradingInput, model: string, effort: Effort) {
  return {
    model,
    max_tokens: CLAUDE_MAX_TOKENS,
    system: buildGradingSystemPrompt(),
    messages: [{ role: "user" as const, content: buildGradingUserMessage(input) }],
    output_config: { effort, format: betaZodOutputFormat(GradingOutputSchema) },
    ...(supportsServerFallback(model)
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : {}),
  };
}

/** Log only the error class and status, never request data, headers, or the paper. */
function logFailure(error: unknown) {
  const name = error instanceof Error ? error.name : typeof error;
  const status = error instanceof Anthropic.APIError ? error.status : undefined;
  const requestId = error instanceof Anthropic.APIError ? error.requestID : undefined;
  console.error("[markwise] Claude grading request failed", { type: name, status, requestId });
}

function toGradingError(error: unknown): GradingError {
  if (error instanceof GradingError) return error;
  logFailure(error);
  // Most specific first: every class below extends Anthropic.APIError.
  if (error instanceof Anthropic.AuthenticationError) {
    return new GradingError("The Claude API key was rejected. Check ANTHROPIC_API_KEY on the server.");
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return new GradingError("The Claude API key does not have access to this model.");
  }
  if (error instanceof Anthropic.NotFoundError) {
    return new GradingError("The configured Claude model was not found. Check ANTHROPIC_MODEL on the server.");
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new GradingError("Claude is rate limited right now. Wait a minute and try again.");
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new GradingError("Claude could not process this grading request. Check the model settings and try again.");
  }
  if (error instanceof Anthropic.InternalServerError) {
    return new GradingError("Claude is temporarily unavailable. Try again in a minute.");
  }
  // An abort here is the call's own deadline (CLAUDE_REQUEST_BUDGET): nothing else cancels it.
  if (error instanceof Anthropic.APIConnectionTimeoutError || error instanceof Anthropic.APIUserAbortError) {
    return new GradingError("Claude took too long to respond. Try again.");
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new GradingError("Could not reach the Claude API. Check the server's network connection and try again.");
  }
  if (error instanceof Anthropic.APIError) {
    return new GradingError(
      error.status ? `Claude returned an error (${error.status}). Try again.` : "Claude returned an error. Try again."
    );
  }
  // The SDK raises a plain AnthropicError when structured output fails to parse.
  if (error instanceof Anthropic.AnthropicError) {
    return new GradingError("Claude returned a response Markwise could not read. Try again.");
  }
  return new GradingError("Claude grading failed. Try again.");
}

export type ClaudeGraderDeps = {
  client: ClaudeParseClient;
  model: string;
  effort: Effort;
  guard: UsageGuard;
  /** Saved first passes; null to always call the API. */
  cache: GradeCacheStore | null;
  /** What the call is for, in the usage ledger (default "essay"). */
  feature?: AiFeature;
};

export class ClaudeGrader implements Grader {
  readonly kind = "claude" as const;
  /** The configured model; updated to the serving model if a fallback answered. */
  model: string;
  /** True when the last grade() reused a saved result instead of calling the API. */
  cacheHit = false;

  constructor(private readonly deps: ClaudeGraderDeps) {
    this.model = deps.model;
  }

  private async readCache(key: string) {
    try {
      return (await this.deps.cache?.get(key)) ?? null;
    } catch (error) {
      console.error("[markwise] Could not read the grading cache", {
        type: error instanceof Error ? error.name : typeof error,
      });
      return null;
    }
  }

  private async writeCache(key: string, parts: GradeCacheKeyParts, result: RawGradingResult) {
    try {
      await this.deps.cache?.set(key, parts, { result, servedModel: this.model });
    } catch (error) {
      console.error("[markwise] Could not save to the grading cache", {
        type: error instanceof Error ? error.name : typeof error,
      });
    }
  }

  async grade(input: GradingInput): Promise<RawGradingResult> {
    this.cacheHit = false;
    const { key, parts } = claudeCacheKey(input, this.deps.model, this.deps.effort);
    const cached = await this.readCache(key);
    if (cached) {
      this.cacheHit = true;
      this.model = cached.servedModel;
      return cached.result;
    }

    const request = buildClaudeGradingRequest(input, this.deps.model, this.deps.effort);
    try {
      const response = await this.deps.guard.run(
        {
          provider: "anthropic",
          feature: this.deps.feature ?? "essay",
          model: this.deps.model,
          reserveMicroUsd: worstCaseCostMicroUsd(this.deps.model, {
            textChars: request.system.length + request.messages[0].content.length,
            maxOutputTokens: CLAUDE_MAX_TOKENS,
          }),
        },
        async () => {
          const message = await this.deps.client.beta.messages.parse(request, {
            timeout: CLAUDE_REQUEST_BUDGET.timeout,
            maxRetries: CLAUDE_REQUEST_BUDGET.maxRetries,
            signal: AbortSignal.timeout(CLAUDE_REQUEST_BUDGET.deadlineMs),
          });
          const { usage } = message;
          return {
            value: message,
            model: message.model,
            usage: {
              inputTokens:
                usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
              outputTokens: usage.output_tokens,
            },
          };
        }
      );

      if (response.stop_reason === "refusal") {
        console.warn("[markwise] Claude declined to grade a paper", { category: response.stop_details?.category ?? null });
        throw new GradingError("The model declined to grade this paper.");
      }
      const parsed = response.parsed_output;
      if (!parsed) {
        console.warn("[markwise] Claude returned no structured output", { stopReason: response.stop_reason });
        throw new GradingError(
          response.stop_reason === "max_tokens"
            ? "Claude's response was cut off before it finished. Try again."
            : "Claude returned a response Markwise could not read. Try again."
        );
      }
      if (response.model) this.model = response.model;

      const result: RawGradingResult = {
        criteria: parsed.criteria.map((item) => ({
          criterionId: item.criterion_id,
          score: item.score,
          justification: item.justification,
          evidence: item.evidence,
        })),
        confidence: parsed.confidence,
        overallComment: parsed.overall_comment,
      };
      await this.writeCache(key, parts, result);
      return result;
    } catch (error) {
      // A cap stopped the call before it was sent: the caller answers 429 with the reason.
      if (error instanceof AiLimitError) throw error;
      throw toGradingError(error);
    }
  }
}
