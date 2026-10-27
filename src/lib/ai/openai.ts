import "server-only";

import OpenAI from "openai";
import { ContentFilterFinishReasonError, LengthFinishReasonError } from "openai/core/error";

import { liveAiAllowed } from "@/lib/ai/usage";

/**
 * OpenAI access for the camera grader, the answer-key scanner, the
 * conference brief, and the goal planner, used when OPENAI_API_KEY is set.
 * Without it, those features run on Claude when ANTHROPIC_API_KEY is set
 * (engineFor in lib/ai/engines.ts, calls in lib/ai/claude-call.ts).
 *
 * MODEL ROUTING (fixed by the product spec, not configurable):
 * - Vision tasks (reading handwriting from photos) use gpt-4o, for the best
 *   handwriting accuracy.
 * - Text and logic tasks (goal planner, conference brief) use gpt-4o-mini,
 *   for speed and low cost.
 *
 * The key is read from OPENAI_API_KEY on the server only (put it in
 * .env.local). It is never sent to the browser, never logged, and never
 * committed. When no key is set, or the kill switch (AI_KILL_SWITCH) is on,
 * every feature falls back to a labelled local demo implementation. Every
 * live call goes through the usage guard (guardedOpenAiCall in guard.ts).
 */
export const OPENAI_MODELS = {
  vision: "gpt-4o",
  text: "gpt-4o-mini",
} as const;

export type OpenAiTask = keyof typeof OPENAI_MODELS;

/** Whether the live OpenAI engines run: a key is set and the kill switch is off. */
export function openAiConfigured(): boolean {
  return liveAiAllowed(process.env.OPENAI_API_KEY);
}

/**
 * How long one call may wait for OpenAI. `timeout` bounds each attempt,
 * `maxRetries` the extra attempts after a timeout, connection error, 429, or
 * 5xx, and `deadlineMs` the whole call including retries and any Retry-After
 * wait, so a stalled API can never outlast the route's maxDuration:
 * - vision: GPT-4o reading up to 4 high-detail photos. 60 s per attempt, one
 *   retry, 110 s in all (fits the 120 s maxDuration of /api/grade and
 *   /api/answer-key).
 * - text: gpt-4o-mini drafting a brief or reading a goal. 30 s per attempt,
 *   one retry, 65 s in all (fits a 90 s route maxDuration).
 */
export const OPENAI_BUDGETS = {
  vision: { timeout: 60_000, maxRetries: 1, deadlineMs: 110_000 },
  text: { timeout: 30_000, maxRetries: 1, deadlineMs: 65_000 },
} as const satisfies Record<OpenAiTask, { timeout: number; maxRetries: number; deadlineMs: number }>;

export type OpenAiRequestOptions = { timeout: number; maxRetries: number; signal: AbortSignal };

/**
 * Per-call options for a task's budget. Pass them as the second argument of
 * every OpenAI call: `.parse({...}, openAiRequestOptions("vision"))`. Create
 * them right before the call: the deadline starts counting now.
 */
export function openAiRequestOptions(task: OpenAiTask): OpenAiRequestOptions {
  const { timeout, maxRetries, deadlineMs } = OPENAI_BUDGETS[task];
  return { timeout, maxRetries, signal: AbortSignal.timeout(deadlineMs) };
}

let client: OpenAI | null = null;

/**
 * Shared client. Throws if OPENAI_API_KEY is not set: check openAiConfigured()
 * first. Its defaults are the text budget per attempt, so a call without
 * openAiRequestOptions() still never waits minutes.
 */
export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  // The SDK reads OPENAI_API_KEY itself; the key is never passed around or logged.
  client ??= new OpenAI({ maxRetries: OPENAI_BUDGETS.text.maxRetries, timeout: OPENAI_BUDGETS.text.timeout });
  return client;
}

/** The model for a task. The only place model names are chosen. */
export function modelFor(task: OpenAiTask): string {
  return OPENAI_MODELS[task];
}

export type OpenAiErrorKind =
  | "auth"
  | "rate_limit"
  | "timeout"
  | "connection"
  | "bad_request"
  | "server"
  | "api"
  | "length"
  | "content_filter"
  | "other";

/**
 * What kind of failure an OpenAI call raised. Uses instanceof, never
 * error.name or constructor.name: the SDK does not set name, and a production
 * build minifies class names.
 */
export function openAiErrorKind(error: unknown): OpenAiErrorKind {
  // Most specific first: the connection and abort classes extend APIError.
  if (error instanceof LengthFinishReasonError) return "length";
  if (error instanceof ContentFilterFinishReasonError) return "content_filter";
  if (error instanceof OpenAI.AuthenticationError || error instanceof OpenAI.PermissionDeniedError) return "auth";
  if (error instanceof OpenAI.RateLimitError) return "rate_limit";
  // An abort here is the call's own deadline (openAiRequestOptions): nothing else cancels.
  if (error instanceof OpenAI.APIConnectionTimeoutError || error instanceof OpenAI.APIUserAbortError) return "timeout";
  if (error instanceof OpenAI.APIConnectionError) return "connection";
  if (error instanceof OpenAI.BadRequestError) return "bad_request";
  if (error instanceof OpenAI.InternalServerError) return "server";
  if (error instanceof OpenAI.APIError) return "api";
  return "other";
}

/** User-facing message for an OpenAI failure. Logs only the failure kind and status. */
export function describeOpenAiError(error: unknown, context: string): string {
  const kind = openAiErrorKind(error);
  const status = error instanceof OpenAI.APIError ? error.status : undefined;
  console.error(`[markwise] ${context} failed`, { kind, status: status ?? null });
  switch (kind) {
    case "auth":
      return "The OpenAI API key was rejected. Check OPENAI_API_KEY on the server.";
    case "rate_limit":
      return "OpenAI is rate limiting requests right now. Try again in a minute.";
    case "timeout":
      return "OpenAI took too long to respond. Try again in a minute.";
    case "connection":
      return "Couldn't reach OpenAI. Check the network and try again.";
    case "bad_request":
      return "OpenAI couldn't process that request. Try a clearer photo or shorter input.";
    case "server":
      return "OpenAI is having trouble right now. Try again in a minute.";
    case "length":
      return "The AI's answer was cut off before it finished. Try again with less input.";
    case "content_filter":
      return "OpenAI declined this request.";
    default:
      return "The AI request failed. Try again.";
  }
}
