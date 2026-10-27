import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

import { callClaudeJson, type ClaudeJsonCall, type ClaudeJsonResult, type ClaudeTask } from "@/lib/ai/claude-call";
import { requestUsageGuard } from "@/lib/ai/guard";
import { CLAUDE_REQUEST_BUDGET, parseEffort, type Effort } from "@/lib/grading/claude-grader";

let client: Anthropic | null = null;

/**
 * The shared Claude API client. The SDK reads ANTHROPIC_API_KEY on the
 * server; the key is never passed around, logged, or sent to the client.
 * Every call sets its own timeout, retries and deadline.
 */
export function getAnthropic(): Anthropic {
  client ??= new Anthropic({ maxRetries: CLAUDE_REQUEST_BUDGET.maxRetries, timeout: CLAUDE_REQUEST_BUDGET.timeout });
  return client;
}

/**
 * One structured-output Claude call for the request being served, under the
 * usage caps (lib/ai/guard.ts). See callClaudeJson for the failure modes.
 */
export function runClaudeJson<S extends z.ZodType>(call: ClaudeJsonCall<S>): Promise<ClaudeJsonResult<z.infer<S>>> {
  return callClaudeJson({ client: getAnthropic(), guard: requestUsageGuard() }, call);
}

/**
 * Effort for a Claude task. Reading photos uses the essay grader's setting
 * (ANTHROPIC_EFFORT, medium by default); the short text tasks run at low.
 */
export function claudeEffort(task: ClaudeTask): Effort {
  return task === "vision" ? parseEffort(process.env.ANTHROPIC_EFFORT) : "low";
}
