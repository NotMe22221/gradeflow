// User preferences: how the app looks (theme, accent, text size, density) and
// how pages are arranged (Home sections in a main and a side column, class
// card order, the review layout). Pure: safe for server and client components
// and unit tests. Stored per user as JSON (UserPreferences.data); everything
// read back goes through normalizePreferences, so stale or unknown values
// fall back to defaults instead of breaking a page. The choices, types and
// defaults are in constants.ts (no zod) and re-exported from here.

import { z } from "zod";

import {
  ACCENTS,
  DEFAULT_PREFERENCES,
  DENSITIES,
  LOOKS,
  PAPER_SIDES,
  SURFACE_SECTIONS,
  TEXT_SIZES,
  THEMES,
  type Column,
  type LayoutSurface,
  type Preferences,
  type SectionLayout,
} from "@/lib/preferences/constants";

export * from "@/lib/preferences/constants";

// --- Validation ---------------------------------------------------------------

const sectionIds = z.array(z.string().min(1).max(32)).max(20);
const sectionLayoutSchema = z.object({ main: sectionIds, side: sectionIds, hidden: sectionIds });

/** What a client may send to update preferences: any subset, nothing else. */
export const preferencesPatchSchema = z
  .object({
    theme: z.enum(THEMES).optional(),
    accent: z.enum(ACCENTS).optional(),
    textSize: z.enum(TEXT_SIZES).optional(),
    density: z.enum(DENSITIES).optional(),
    look: z.enum(LOOKS).optional(),
    singleKeyShortcuts: z.boolean().optional(),
    layout: z
      .object({
        teacherHome: sectionLayoutSchema.optional(),
        studentHome: sectionLayoutSchema.optional(),
        classOrder: z.array(z.string().min(1).max(64)).max(200).optional(),
        reviewPaperSide: z.enum(PAPER_SIDES).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>;

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/**
 * A surface's layout with only known section ids, each placed exactly once.
 * Sections missing from a saved layout (e.g. added in a later release) go
 * back to their default column, after the saved ones.
 */
export function normalizeSectionLayout(surface: LayoutSurface, raw: unknown): SectionLayout {
  const known = SURFACE_SECTIONS[surface] as Record<string, { column: Column; essential: boolean }>;
  const value = (raw ?? {}) as Partial<Record<keyof SectionLayout, unknown>>;
  const placed = new Set<string>();
  const take = (ids: unknown) =>
    strings(ids).filter((id) => {
      if (!(id in known) || placed.has(id)) return false;
      placed.add(id);
      return true;
    });
  const main = take(value.main);
  const side = take(value.side);
  for (const [id, section] of Object.entries(known)) {
    if (placed.has(id)) continue;
    (section.column === "side" ? side : main).push(id);
    placed.add(id);
  }
  const hidden = [...new Set(strings(value.hidden).filter((id) => id in known && !known[id].essential))];
  return { main, side, hidden };
}

/** Any stored or partial value, made complete and valid. */
export function normalizePreferences(raw: unknown): Preferences {
  const value = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const layout = (value.layout && typeof value.layout === "object" ? value.layout : {}) as Record<string, unknown>;
  return {
    theme: pick(value.theme, THEMES, DEFAULT_PREFERENCES.theme),
    accent: pick(value.accent, ACCENTS, DEFAULT_PREFERENCES.accent),
    textSize: pick(value.textSize, TEXT_SIZES, DEFAULT_PREFERENCES.textSize),
    density: pick(value.density, DENSITIES, DEFAULT_PREFERENCES.density),
    look: pick(value.look, LOOKS, DEFAULT_PREFERENCES.look),
    singleKeyShortcuts:
      typeof value.singleKeyShortcuts === "boolean" ? value.singleKeyShortcuts : DEFAULT_PREFERENCES.singleKeyShortcuts,
    layout: {
      teacherHome: normalizeSectionLayout("teacherHome", layout.teacherHome),
      studentHome: normalizeSectionLayout("studentHome", layout.studentHome),
      classOrder: [...new Set(strings(layout.classOrder))].slice(0, 200),
      reviewPaperSide: pick(layout.reviewPaperSide, PAPER_SIDES, DEFAULT_PREFERENCES.layout.reviewPaperSide),
    },
  };
}

/** Apply a validated patch on top of current preferences. */
export function mergePreferences(current: Preferences, patch: PreferencesPatch): Preferences {
  return normalizePreferences({
    ...current,
    ...patch,
    layout: { ...current.layout, ...(patch.layout ?? {}) },
  });
}

/**
 * Items sorted by a saved id order; items the order doesn't mention keep their
 * original relative order and come after the ordered ones (new classes appear
 * at the end, as in Classroom).
 */
export function orderByIds<T extends { id: string }>(items: readonly T[], order: readonly string[]): T[] {
  const rank = new Map(order.map((id, index) => [id, index]));
  return items
    .map((item, index) => ({ item, index, rank: rank.get(item.id) }))
    .sort((a, b) => {
      if (a.rank !== undefined && b.rank !== undefined) return a.rank - b.rank;
      if (a.rank !== undefined) return -1;
      if (b.rank !== undefined) return 1;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}
