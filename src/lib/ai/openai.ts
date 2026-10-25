import "server-only";

import OpenAI from "openai";

/**
 * OpenAI access for the camera grader, the answer-key scanner, the
 * conference brief, and the goal planner.
 *
 * MODEL ROUTING (fixed by the product spec, not configurable):
 * - Vision tasks (reading handwriting from photos) use gpt-4o, for the best
 *   handwriting accuracy.
 * - Text and logic tasks (goal planner, conference brief) use gpt-4o-mini,
 *   for speed and low cost.
 *
 * The key is read from OPENAI_API_KEY on the server only (put it in
 * .env.local). It is never sent to the browser, never logged, and never
 * committed. When it is not set, every feature falls back to a labelled
 * local demo implementation.
 */
export const OPENAI_MODELS = {
  vision: "gpt-4o",
  text: "gpt-4o-mini",
} as const;

export type OpenAiTask = keyof typeof OPENAI_MODELS;

export function openAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

let client: OpenAI | null = null;

/** Shared client. Throws if OPENAI_API_KEY is not set: check openAiConfigured() first. */
export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  // The SDK reads OPENAI_API_KEY itself; the key is never passed around or logged.
  client ??= new OpenAI({ maxRetries: 2, timeout: 90_000 });
  return client;
}

/** The model for a task. The only place model names are chosen. */
export function modelFor(task: OpenAiTask): string {
  return OPENAI_MODELS[task];
}

/** User-facing message for an OpenAI failure. Logs only the error class and status. */
export function describeOpenAiError(error: unknown, context: string): string {
  const status = error instanceof OpenAI.APIError ? error.status : undefined;
  console.error(`[gradesmart] ${context} failed`, {
    type: error instanceof Error ? error.name : typeof error,
    status: status ?? null,
  });
  if (error instanceof OpenAI.AuthenticationError) return "The OpenAI API key was rejected. Check OPENAI_API_KEY on the server.";
  if (error instanceof OpenAI.RateLimitError) return "OpenAI is rate limiting requests right now. Try again in a minute.";
  if (error instanceof OpenAI.APIConnectionError) return "Couldn't reach OpenAI. Check the network and try again.";
  if (error instanceof OpenAI.BadRequestError) return "OpenAI couldn't process that request. Try a clearer photo or shorter input.";
  return "The AI request failed. Try again.";
}
