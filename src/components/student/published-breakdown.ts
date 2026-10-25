// Parsing PublishedGrade.breakdown for the student view. Pure: safe for server
// and client components and unit tests.
//
// The breakdown is a JSON string written by publishApprovedGrade(). It is read
// defensively: a malformed row is skipped rather than breaking the page.

import { z } from "zod";

const breakdownItemSchema = z.object({
  criterionId: z.string(),
  title: z.string(),
  maxPoints: z.number().finite().nonnegative(),
  score: z.number().finite().nonnegative(),
  comment: z.string().nullish(),
});

export type StudentBreakdownItem = {
  criterionId: string;
  title: string;
  maxPoints: number;
  score: number;
  comment: string;
};

export function parsePublishedBreakdown(raw: string | null | undefined): StudentBreakdownItem[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const items: StudentBreakdownItem[] = [];
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

/** Share of a criterion earned, clamped to 0..100 for a progress bar. */
export function scoreShare(score: number, max: number): number {
  if (!(max > 0)) return 0;
  return Math.max(0, Math.min(100, (score / max) * 100));
}
