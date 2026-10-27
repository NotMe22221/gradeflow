import "server-only";

import { modelFor, openAiConfigured, type OpenAiTask } from "@/lib/ai/openai";
import { formatUsd } from "@/lib/ai/pricing";
import { aiKillSwitchOn, readUsageLimits } from "@/lib/ai/usage";
import type { GraderKind } from "@/lib/constants";
import { activeGraderKind, claudeModel, getGraderInfo, type GraderInfo } from "@/lib/grading/config";

/** The engine behind a feature: which provider (or the demo engine), and its model. */
export type TaskEngine = { kind: GraderKind; model: string | null };

/**
 * Which engine runs a vision task (handwritten tests, answer-key photos) or a
 * text task (conference briefs, the goal planner):
 * 1. OpenAI when OPENAI_API_KEY is set (gpt-4o for vision, gpt-4o-mini for text);
 * 2. otherwise Claude when ANTHROPIC_API_KEY is set (the essay grader's model);
 * 3. otherwise the labelled local demo engine.
 * The kill switch (AI_KILL_SWITCH) turns both providers off. The one place
 * this choice is made, so the UI label always matches the engine that runs.
 */
export function engineFor(task: OpenAiTask): TaskEngine {
  if (openAiConfigured()) return { kind: "openai", model: modelFor(task) };
  if (activeGraderKind() === "claude") return { kind: "claude", model: claudeModel() };
  return { kind: "demo", model: null };
}

/**
 * Which engine powers each AI feature right now. Safe to pass to client
 * components: it says whether keys are configured, never what they are.
 */
export type EngineStatus = {
  /** Typed essays: Claude, or the demo grader. */
  essays: GraderInfo;
  /** Handwritten tests and answer keys: engineFor("vision"). */
  vision: TaskEngine;
  /** Conference briefs and the goal planner: engineFor("text"). */
  text: TaskEngine;
  /** AI_KILL_SWITCH is on: every feature runs its demo engine, whatever keys are set. */
  killSwitch: boolean;
  /** The live AI caps in words (lib/ai/usage.ts), for the engines popover. */
  limits: string;
};

export function getEngineStatus(): EngineStatus {
  const limits = readUsageLimits();
  return {
    essays: getGraderInfo(),
    vision: engineFor("vision"),
    text: engineFor("text"),
    killSwitch: aiKillSwitchOn(),
    limits:
      `Live AI calls are capped at ${limits.perSessionPerHour} per session and ${limits.perIpPerHour} per network ` +
      `an hour, and ${limits.perDay} (about ${formatUsd(limits.spendPerDayMicroUsd)}) a day for the whole site.`,
  };
}
