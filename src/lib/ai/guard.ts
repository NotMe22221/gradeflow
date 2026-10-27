import "server-only";

import { NextResponse } from "next/server";

import { chatInputSize, worstCaseCostMicroUsd } from "@/lib/ai/pricing";
import {
  aiKillSwitchOn,
  createUsageGuard,
  readUsageLimits,
  type AiFeature,
  type AiLimitError,
  type UsageGuard,
} from "@/lib/ai/usage";
import { databaseUsageStore } from "@/lib/ai/usage-store";
import { usageSubject } from "@/lib/auth/session";

/**
 * The usage guard for live AI calls made while serving a request: the caps
 * come from the environment (readUsageLimits), the counts from the AiCall
 * ledger, and the caller from the session cookie and client IP. Every paid
 * provider call in the app goes through it.
 */
export function requestUsageGuard(): UsageGuard {
  return createUsageGuard({
    store: databaseUsageStore,
    subject: usageSubject,
    limits: readUsageLimits(),
    killSwitch: aiKillSwitchOn(),
  });
}

/** Output tokens to reserve for an OpenAI request that sets no max_completion_tokens. */
const DEFAULT_OPENAI_MAX_OUTPUT = 4_000;

type OpenAiUsage = { prompt_tokens: number; completion_tokens: number } | null | undefined;

/**
 * One OpenAI chat completion through the usage guard. `request` is the body
 * about to be sent (for the reservation), `send` makes the call. The cost is
 * settled at the requested model's price: OpenAI answers with a dated
 * snapshot name that the price table doesn't list.
 */
export function guardedOpenAiCall<T extends { usage?: OpenAiUsage }>(
  feature: AiFeature,
  request: { model: string; messages: readonly { content?: unknown }[]; max_completion_tokens?: number | null },
  send: () => Promise<T>
): Promise<T> {
  const reserveMicroUsd = worstCaseCostMicroUsd(request.model, {
    ...chatInputSize(request.messages),
    maxOutputTokens: request.max_completion_tokens ?? DEFAULT_OPENAI_MAX_OUTPUT,
  });
  return requestUsageGuard().run({ provider: "openai", feature, model: request.model, reserveMicroUsd }, async () => {
    const completion = await send();
    const usage = completion.usage
      ? { inputTokens: completion.usage.prompt_tokens, outputTokens: completion.usage.completion_tokens }
      : null;
    return { value: completion, usage };
  });
}

/** The JSON answer for a call the caps stopped: 429 (503 for the kill switch) with Retry-After. */
export function aiLimitResponse(error: AiLimitError, headers?: Record<string, string>) {
  const retry: Record<string, string> =
    error.retryAfterSeconds > 0 ? { "Retry-After": String(error.retryAfterSeconds) } : {};
  return NextResponse.json(
    { ok: false, error: error.message, code: "AI_LIMIT" },
    { status: error.status, headers: { ...headers, ...retry } }
  );
}
