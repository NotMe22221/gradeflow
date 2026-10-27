// One structured-output request to the Claude API, for the features that
// started on OpenAI: the camera grader, the answer-key reader, the conference
// brief, and the goal planner. Pure apart from the network call it is handed:
// the client and the usage guard are injected (src/lib/ai/anthropic.ts wires
// the real ones), so tests stub the provider at this boundary and no test
// ever calls the paid API.
//
// The stop reason is checked before the output is parsed, so a refusal or a
// cut-off answer gets its own message instead of a parse error. Callers still
// validate the parsed output against their own rules before storing it.

import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

import { claudeOutputFormat, claudeWorstCaseMicroUsd, serverFallbackFields } from "@/lib/ai/claude-format";
import { CLAUDE_TOKENS_PER_IMAGE } from "@/lib/ai/pricing";
import type { AiFeature, UsageGuard } from "@/lib/ai/usage";
import type { Effort } from "@/lib/grading/claude-grader";

/** Reading photos (handwritten tests, answer keys), or short text tasks (briefs, goals). */
export type ClaudeTask = "vision" | "text";

/**
 * How long one call may wait: `deadlineMs` for the whole call, retries
 * included, so it always ends inside the route's maxDuration (120 s for
 * /api/grade and /api/answer-key, 90 s for the brief and the goal planner).
 * One attempt may use the whole deadline: the answer is not streamed, so a
 * slow but valid one (four dense pages plus thinking) arrives only at the
 * end. The one retry is for errors that come back fast (overloaded, a 5xx, a
 * dropped connection); a stalled attempt ends at the deadline instead of
 * starting a second paid one that could not finish.
 */
export const CLAUDE_TASK_BUDGETS = {
  vision: { timeout: 110_000, maxRetries: 1, deadlineMs: 110_000 },
  text: { timeout: 65_000, maxRetries: 1, deadlineMs: 65_000 },
} as const satisfies Record<ClaudeTask, { timeout: number; maxRetries: number; deadlineMs: number }>;

/** The image types the scanner accepts (lib/scan/images.ts), all of which Claude reads. */
export type ClaudeImage = { bytes: Uint8Array; mimeType: "image/jpeg" | "image/png" | "image/webp" };

/** One piece of the user turn, in order: teacher text, labels, and photos. */
export type ClaudePart = { type: "text"; text: string } | { type: "image"; image: ClaudeImage };

export type ClaudeJsonCall<S extends z.ZodType> = {
  feature: AiFeature;
  task: ClaudeTask;
  model: string;
  effort: Effort;
  system: string;
  parts: readonly ClaudePart[];
  schema: S;
  /** Thinking counts toward it on current models; it also bounds the call's reserved cost. */
  maxTokens: number;
};

export function buildClaudeJsonRequest<S extends z.ZodType>(call: ClaudeJsonCall<S>) {
  return {
    model: call.model,
    max_tokens: call.maxTokens,
    system: call.system,
    messages: [
      {
        role: "user" as const,
        content: call.parts.map((part) =>
          part.type === "text"
            ? { type: "text" as const, text: part.text }
            : {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: part.image.mimeType,
                  data: Buffer.from(part.image.bytes).toString("base64"),
                },
              }
        ),
      },
    ],
    output_config: { effort: call.effort, format: claudeOutputFormat(call.schema) },
    ...serverFallbackFields(call.model),
  };
}

/** The most this call can cost (a fallback rerun included), held by the usage guard until it settles. */
export function claudeReserveMicroUsd<S extends z.ZodType>(call: ClaudeJsonCall<S>): number {
  const textChars = call.system.length + call.parts.reduce((sum, part) => sum + (part.type === "text" ? part.text.length : 0), 0);
  const images = call.parts.filter((part) => part.type === "image").length;
  return claudeWorstCaseMicroUsd(call.model, {
    textChars,
    images,
    tokensPerImage: CLAUDE_TOKENS_PER_IMAGE,
    maxOutputTokens: call.maxTokens,
  });
}

export type ClaudeErrorKind =
  | "refusal"
  | "max_tokens"
  | "unreadable"
  | "auth"
  | "permission"
  | "not_found"
  | "rate_limit"
  | "bad_request"
  | "server"
  | "timeout"
  | "connection"
  | "api"
  | "other";

/**
 * A failed Claude call. `message` is safe to show (it never holds request
 * data); `kind` lets a feature word the common cases its own way.
 */
export class ClaudeCallError extends Error {
  constructor(
    readonly kind: ClaudeErrorKind,
    readonly status: number | null = null
  ) {
    super(claudeErrorMessage(kind, status));
    this.name = "ClaudeCallError";
  }
}

/**
 * What kind of failure the SDK raised. Uses instanceof, never error.name: a
 * production build minifies class names.
 */
export function claudeErrorKind(error: unknown): ClaudeErrorKind {
  if (error instanceof ClaudeCallError) return error.kind;
  // Most specific first: every class below extends Anthropic.APIError.
  if (error instanceof Anthropic.AuthenticationError) return "auth";
  if (error instanceof Anthropic.PermissionDeniedError) return "permission";
  if (error instanceof Anthropic.NotFoundError) return "not_found";
  if (error instanceof Anthropic.RateLimitError) return "rate_limit";
  if (error instanceof Anthropic.BadRequestError) return "bad_request";
  if (error instanceof Anthropic.InternalServerError) return "server";
  // An abort here is the call's own deadline (CLAUDE_TASK_BUDGETS): nothing else cancels it.
  if (error instanceof Anthropic.APIConnectionTimeoutError || error instanceof Anthropic.APIUserAbortError) return "timeout";
  if (error instanceof Anthropic.APIConnectionError) return "connection";
  if (error instanceof Anthropic.APIError) return "api";
  return "other";
}

export function claudeErrorMessage(kind: ClaudeErrorKind, status: number | null = null): string {
  switch (kind) {
    case "refusal":
      return "Claude declined this request.";
    case "max_tokens":
      return "Claude's answer was cut off before it finished. Try again with less input.";
    case "unreadable":
      return "Claude returned a response Markwise could not read. Try again.";
    case "auth":
      return "The Claude API key was rejected. Check ANTHROPIC_API_KEY on the server.";
    case "permission":
      return "The Claude API key does not have access to this model.";
    case "not_found":
      return "The configured Claude model was not found. Check ANTHROPIC_MODEL on the server.";
    case "rate_limit":
      return "Claude is rate limited right now. Wait a minute and try again.";
    case "bad_request":
      return "Claude couldn't process this request. Check the model settings on the server, then try again.";
    case "server":
      return "Claude is temporarily unavailable. Try again in a minute.";
    case "timeout":
      return "Claude took too long to respond. Try again.";
    case "connection":
      return "Could not reach the Claude API. Check the server's network connection and try again.";
    case "api":
      return status ? `Claude returned an error (${status}). Try again.` : "Claude returned an error. Try again.";
    default:
      return "The AI request failed. Try again.";
  }
}

/** The one SDK method these calls use: the boundary tests stub. */
export type ClaudeCreateClient = { beta: { messages: Pick<Anthropic["beta"]["messages"], "create"> } };

export type ClaudeJsonResult<T> = { parsed: T; model: string };

/**
 * Send one structured-output request through the usage guard and parse the
 * answer with `schema`. A cap that stops the call (AiLimitError) propagates
 * as is; every other failure becomes a ClaudeCallError. Logs only the kind,
 * the status, the stop reason and the request id: never the key, the
 * request, or student work.
 */
export async function callClaudeJson<S extends z.ZodType>(
  deps: { client: ClaudeCreateClient; guard: UsageGuard },
  call: ClaudeJsonCall<S>
): Promise<ClaudeJsonResult<z.infer<S>>> {
  const request = buildClaudeJsonRequest(call);
  const budget = CLAUDE_TASK_BUDGETS[call.task];
  const message = await deps.guard.run(
    { provider: "anthropic", feature: call.feature, model: call.model, reserveMicroUsd: claudeReserveMicroUsd(call) },
    async () => {
      let response;
      try {
        response = await deps.client.beta.messages.create(request, {
          timeout: budget.timeout,
          maxRetries: budget.maxRetries,
          signal: AbortSignal.timeout(budget.deadlineMs),
        });
      } catch (error) {
        const kind = claudeErrorKind(error);
        const status = error instanceof Anthropic.APIError ? (error.status ?? null) : null;
        const requestId = error instanceof Anthropic.APIError ? error.requestID : undefined;
        console.error("[markwise] Claude request failed", { feature: call.feature, kind, status, requestId });
        throw new ClaudeCallError(kind, status);
      }
      const { usage } = response;
      return {
        value: response,
        model: response.model,
        usage: {
          inputTokens: usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
          outputTokens: usage.output_tokens,
        },
      };
    }
  );

  if (message.stop_reason === "refusal") {
    console.warn("[markwise] Claude declined a request", {
      feature: call.feature,
      category: message.stop_details?.category ?? null,
    });
    throw new ClaudeCallError("refusal");
  }
  if (message.stop_reason === "max_tokens") {
    console.warn("[markwise] Claude's answer was cut off", { feature: call.feature });
    throw new ClaudeCallError("max_tokens");
  }

  const text = message.content.find((block) => block.type === "text")?.text;
  let json: unknown;
  try {
    json = text === undefined ? undefined : JSON.parse(text);
  } catch {
    json = undefined;
  }
  const parsed = json === undefined ? null : call.schema.safeParse(json);
  if (!parsed?.success) {
    console.warn("[markwise] Claude returned no usable structured output", {
      feature: call.feature,
      stopReason: message.stop_reason,
    });
    throw new ClaudeCallError("unreadable");
  }
  return { parsed: parsed.data, model: message.model || call.model };
}
