// The first-pass cache key and store contract. Pure: safe for unit tests. The
// database store is src/lib/grading/cache-store.ts.
//
// A live first pass is saved under (paper hash, rubric hash, model, prompt
// hash). Grading the same paper against the same rubric with the same model
// and prompt again reuses it, so a repeated click or a re-run never pays for
// an identical call. Anything that changes the request changes the key: an
// edited paper, an edited rubric or assignment, another model, or a new
// prompt or effort setting.

import { createHash } from "node:crypto";

import type { GradingInput, RawGradingResult } from "@/lib/grading/types";

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** The paper exactly as graded: any change, even whitespace, is a new paper. */
export function paperHash(paper: string): string {
  return sha256(paper);
}

/** Everything the teacher wrote that the grader sees: the assignment and every criterion. */
export function rubricHash(input: Pick<GradingInput, "assignmentTitle" | "instructions" | "criteria">): string {
  return sha256(
    JSON.stringify({
      title: input.assignmentTitle,
      instructions: input.instructions,
      criteria: input.criteria.map(({ id, title, description, maxPoints }) => ({ id, title, description, maxPoints })),
    })
  );
}

/** The request settings that shape the answer: prompt text, effort, and output limit. */
export function promptHash(parts: readonly (string | number)[]): string {
  return sha256(JSON.stringify(parts));
}

export type GradeCacheKeyParts = { paperHash: string; rubricHash: string; model: string; promptHash: string };

export function gradeCacheKey(parts: GradeCacheKeyParts): string {
  return sha256(`${parts.paperHash}:${parts.rubricHash}:${parts.model}:${parts.promptHash}`);
}

export type CachedGrade = {
  result: RawGradingResult;
  /** The model that actually answered (a server-side fallback can differ from the requested one). */
  servedModel: string;
};

export interface GradeCacheStore {
  get(key: string): Promise<CachedGrade | null>;
  set(key: string, parts: GradeCacheKeyParts, value: CachedGrade): Promise<void>;
}

const CONFIDENCES = new Set(["high", "medium", "low"]);

/**
 * Read a stored entry back, or null if it doesn't have the expected shape.
 * The result is still raw grader output: validate.ts checks it against the
 * paper again before anything is saved.
 */
export function parseCachedGrade(json: string): CachedGrade | null {
  try {
    const value = JSON.parse(json) as Partial<CachedGrade> | null;
    const result = value?.result;
    if (!value || typeof value.servedModel !== "string" || !result) return null;
    if (!Array.isArray(result.criteria) || !CONFIDENCES.has(result.confidence)) return null;
    if (typeof result.overallComment !== "string") return null;
    const criteriaOk = result.criteria.every(
      (item) =>
        typeof item?.criterionId === "string" &&
        typeof item.score === "number" &&
        typeof item.justification === "string" &&
        typeof item.evidence === "string"
    );
    return criteriaOk ? { result, servedModel: value.servedModel } : null;
  } catch {
    return null;
  }
}

/** A single-process cache for unit tests and offline scripts. */
export function createMemoryGradeCache(): GradeCacheStore & { entries: Map<string, string> } {
  const entries = new Map<string, string>();
  return {
    entries,
    async get(key) {
      const json = entries.get(key);
      return json === undefined ? null : parseCachedGrade(json);
    },
    async set(key, _parts, value) {
      entries.set(key, JSON.stringify(value));
    },
  };
}
