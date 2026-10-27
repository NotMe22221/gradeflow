import "server-only";

import { modelFor, openAiConfigured } from "@/lib/ai/openai";
import { formatUsd } from "@/lib/ai/pricing";
import { aiKillSwitchOn, readUsageLimits } from "@/lib/ai/usage";
import { getGraderInfo, type GraderInfo } from "@/lib/grading/config";

/**
 * Which engine powers each AI feature right now. Safe to pass to client
 * components: it says whether keys are configured, never what they are.
 */
export type EngineStatus = {
  /** Typed essays: Claude, or the demo grader. */
  essays: GraderInfo;
  /** Handwritten tests and answer keys (vision): gpt-4o, or the demo scanner. */
  vision: { live: boolean; model: string | null };
  /** Conference briefs and the goal planner (text): gpt-4o-mini, or demo templates. */
  text: { live: boolean; model: string | null };
  /** AI_KILL_SWITCH is on: every feature runs its demo engine, whatever keys are set. */
  killSwitch: boolean;
  /** The live AI caps in words (lib/ai/usage.ts), for the engines popover. */
  limits: string;
};

export function getEngineStatus(): EngineStatus {
  const openai = openAiConfigured();
  const limits = readUsageLimits();
  return {
    essays: getGraderInfo(),
    vision: { live: openai, model: openai ? modelFor("vision") : null },
    text: { live: openai, model: openai ? modelFor("text") : null },
    killSwitch: aiKillSwitchOn(),
    limits:
      `Live AI calls are capped at ${limits.perSessionPerHour} per session and ${limits.perIpPerHour} per network ` +
      `an hour, and ${limits.perDay} (about ${formatUsd(limits.spendPerDayMicroUsd)}) a day for the whole site.`,
  };
}
