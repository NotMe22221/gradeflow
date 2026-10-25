// Conference brief output: the structured-output schema sent to the text
// model, and the validation that runs on everything the model (or the demo
// template) returns before it reaches the teacher.
// Pure: safe for client components, server code, and unit tests.

import { z } from "zod";

import type { ConferenceBrief } from "@/lib/briefs/types";

export const BRIEF_LIMITS = {
  headlineMax: 160,
  /** Summary and every list item. */
  textMax: 400,
  minItems: 1,
  maxItems: 5,
} as const;

/**
 * Structured-output schema. Every field is required and has no defaults or
 * range checks, as structured outputs require; counts and lengths are
 * enforced by normalizeBriefOutput().
 */
export const BriefOutputSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()),
  growth_areas: z.array(z.string()),
  talking_points: z.array(z.string()),
  next_steps: z.array(z.string()),
  questions_for_family: z.array(z.string()),
});

export type BriefOutput = z.infer<typeof BriefOutputSchema>;

export const INCOMPLETE_BRIEF_ERROR = "The brief came back incomplete. Try generating it again.";

/** Strip control characters and markdown emphasis, collapse whitespace. */
export function cleanBriefText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\*\*|__/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cut text to `max` characters at a word boundary when possible, ending with an ellipsis. */
export function clipBriefText(value: string, max: number): string {
  if (value.length <= max) return value;
  const room = max - 1;
  const cut = value.lastIndexOf(" ", room);
  const head = cut > room * 0.6 ? value.slice(0, cut) : value.slice(0, room);
  return `${head.replace(/[\s,;:.-]+$/, "")}…`;
}

/**
 * A list item without a leading bullet or number the model may have added.
 * An item with no letters or digits left (a stray "-") is dropped.
 */
function cleanItem(value: string): string {
  const cleaned = cleanBriefText(value)
    .replace(/^(?:[-*•–]+|\d{1,2}[.)])(?:\s+|$)/, "")
    .trim();
  return /[\p{L}\p{N}]/u.test(cleaned) ? cleaned : "";
}

function normalizeList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const cleaned = cleanItem(value);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(clipBriefText(cleaned, BRIEF_LIMITS.textMax));
    if (items.length >= BRIEF_LIMITS.maxItems) break;
  }
  return items;
}

export type BriefCheck = { ok: true; brief: ConferenceBrief } | { ok: false; error: string };

/**
 * Clean and cap a brief: strings trimmed and clipped (headline <= 160, every
 * other string <= 400 characters), lists de-duplicated and cut to 1..5 items.
 * A brief with an empty headline, summary, or list is rejected.
 */
export function finalizeBrief(draft: ConferenceBrief): BriefCheck {
  const headline = clipBriefText(cleanBriefText(draft.headline ?? ""), BRIEF_LIMITS.headlineMax);
  const summary = clipBriefText(cleanBriefText(draft.summary ?? ""), BRIEF_LIMITS.textMax);
  const brief: ConferenceBrief = {
    headline,
    summary,
    strengths: normalizeList(draft.strengths ?? []),
    growthAreas: normalizeList(draft.growthAreas ?? []),
    talkingPoints: normalizeList(draft.talkingPoints ?? []),
    nextSteps: normalizeList(draft.nextSteps ?? []),
    questionsForFamily: normalizeList(draft.questionsForFamily ?? []),
  };

  const lists = [brief.strengths, brief.growthAreas, brief.talkingPoints, brief.nextSteps, brief.questionsForFamily];
  if (!headline || !summary || lists.some((list) => list.length < BRIEF_LIMITS.minItems)) {
    return { ok: false, error: INCOMPLETE_BRIEF_ERROR };
  }
  return { ok: true, brief };
}

/** Validate the model's structured output (snake_case) and return the camelCase brief. */
export function normalizeBriefOutput(raw: unknown): BriefCheck {
  const parsed = BriefOutputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: INCOMPLETE_BRIEF_ERROR };
  const data = parsed.data;
  return finalizeBrief({
    headline: data.headline,
    summary: data.summary,
    strengths: data.strengths,
    growthAreas: data.growth_areas,
    talkingPoints: data.talking_points,
    nextSteps: data.next_steps,
    questionsForFamily: data.questions_for_family,
  });
}
