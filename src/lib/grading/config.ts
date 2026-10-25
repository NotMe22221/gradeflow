import "server-only";

import { GRADER_LABELS, type GraderKind } from "@/lib/constants";

export const DEFAULT_CLAUDE_MODEL = "claude-opus-5-5";

/**
 * The single switch for which grader runs the AI first pass. getGrader()
 * (index.ts) and getGraderInfo() both read it, so the UI label always matches
 * the engine that actually grades.
 */
/** Engines that grade typed essays. Handwritten tests use the camera grader (src/lib/scan). */
export type EssayGraderKind = Extract<GraderKind, "claude" | "demo">;

export function activeGraderKind(): EssayGraderKind {
  return process.env.ANTHROPIC_API_KEY ? "claude" : "demo";
}

export function claudeModel(): string {
  return process.env.ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL;
}

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
  const kind = activeGraderKind();
  return { kind, label: GRADER_LABELS[kind], model: kind === "claude" ? claudeModel() : null };
}
