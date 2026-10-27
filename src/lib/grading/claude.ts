import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

import { claudeModel } from "@/lib/grading/config";
import { buildGradingSystemPrompt, buildGradingUserMessage } from "@/lib/grading/prompt";
import type { Grader, GradingInput, RawGradingResult } from "@/lib/grading/types";
import { GradingError } from "@/lib/grading/validate";

/**
 * The Claude API grader. The API key is read by the SDK from
 * ANTHROPIC_API_KEY on the server; it is never passed around, logged, or sent
 * to the client. Output is shaped by structured outputs, then validated again
 * by validate.ts before anything is stored.
 */

const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;
type Effort = (typeof EFFORT_LEVELS)[number];

function resolveEffort(): Effort {
  const value = process.env.ANTHROPIC_EFFORT?.trim().toLowerCase();
  return (EFFORT_LEVELS as readonly string[]).includes(value ?? "") ? (value as Effort) : "medium";
}

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

let sharedClient: Anthropic | null = null;

function getClient(): Anthropic {
  sharedClient ??= new Anthropic({ maxRetries: 2, timeout: 120_000 });
  return sharedClient;
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
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new GradingError("Claude took too long to respond. Try again.");
  }
  if (error instanceof Anthropic.APIUserAbortError) {
    return new GradingError("The grading request was cancelled. Try again.");
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

export class ClaudeGrader implements Grader {
  readonly kind = "claude" as const;
  /** The configured model; updated to the serving model if a fallback answered. */
  model: string;
  private readonly effort: Effort;

  constructor() {
    // The same resolution getGraderInfo() shows in the UI.
    this.model = claudeModel();
    this.effort = resolveEffort();
  }

  async grade(input: GradingInput): Promise<RawGradingResult> {
    try {
      const response = await getClient().beta.messages.parse({
        model: this.model,
        max_tokens: 16000,
        system: buildGradingSystemPrompt(),
        messages: [{ role: "user", content: buildGradingUserMessage(input) }],
        output_config: { effort: this.effort, format: betaZodOutputFormat(GradingOutputSchema) },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });

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

      return {
        criteria: parsed.criteria.map((item) => ({
          criterionId: item.criterion_id,
          score: item.score,
          justification: item.justification,
          evidence: item.evidence,
        })),
        confidence: parsed.confidence,
        overallComment: parsed.overall_comment,
      };
    } catch (error) {
      throw toGradingError(error);
    }
  }
}
