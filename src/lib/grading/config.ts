import "server-only";

import type { GraderKind } from "@/lib/constants";

export const DEFAULT_CLAUDE_MODEL = "claude-opus-5-5";

export type GraderInfo = {
  kind: GraderKind;
  /** Human label shown in the UI. */
  label: string;
  model: string | null;
};

/**
 * Which grader runs the AI first pass. Safe to pass to client components:
 * it never contains the API key, only whether one is configured.
 */
export function getGraderInfo(): GraderInfo {
  if (process.env.ANTHROPIC_API_KEY) {
    const model = process.env.ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL;
    return { kind: "claude", label: "Claude", model };
  }
  return { kind: "demo", label: "Demo grader", model: null };
}
