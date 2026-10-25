import "server-only";

import { modelFor, openAiConfigured } from "@/lib/ai/openai";
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
};

export function getEngineStatus(): EngineStatus {
  const openai = openAiConfigured();
  return {
    essays: getGraderInfo(),
    vision: { live: openai, model: openai ? modelFor("vision") : null },
    text: { live: openai, model: openai ? modelFor("text") : null },
  };
}
