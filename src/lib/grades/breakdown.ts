// PublishedGrade.breakdown: one codec for the writer (publishApprovedGrade and
// the seed) and every reader (student view). Pure: safe for client
// components, server code, and unit tests.

import { z } from "zod";

/** One entry of PublishedGrade.breakdown, in rubric order. */
export type BreakdownItem = {
  criterionId: string;
  title: string;
  maxPoints: number;
  score: number;
  comment: string;
};

const breakdownItemSchema = z.object({
  criterionId: z.string(),
  title: z.string(),
  maxPoints: z.number().finite().nonnegative(),
  score: z.number().finite().nonnegative(),
  comment: z.string().nullish(),
});

export function serializeBreakdown(items: BreakdownItem[]): string {
  return JSON.stringify(items);
}

/** Read a stored breakdown defensively: malformed entries are skipped. */
export function parseBreakdown(raw: string | null | undefined): BreakdownItem[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const items: BreakdownItem[] = [];
  for (const entry of data) {
    const parsed = breakdownItemSchema.safeParse(entry);
    if (!parsed.success) continue;
    items.push({
      criterionId: parsed.data.criterionId,
      title: parsed.data.title,
      maxPoints: parsed.data.maxPoints,
      score: Math.min(parsed.data.score, parsed.data.maxPoints),
      comment: (parsed.data.comment ?? "").trim(),
    });
  }
  return items;
}
