// User preferences: how the app looks (theme, accent, text size, density) and
// how pages are arranged (Home sections in a main and a side column, class
// card order, the review layout). Pure: safe for server and client components
// and unit tests. Stored per user as JSON (UserPreferences.data); everything
// read back goes through normalizePreferences, so stale or unknown values
// fall back to defaults instead of breaking a page.

import { z } from "zod";

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** Accent colors for buttons, links, the active nav item and focus rings. */
export const ACCENTS = ["blue", "teal", "green", "orange", "pink", "slate"] as const;
export type Accent = (typeof ACCENTS)[number];

/** Root font size: 87.5%, 100%, 112.5%, 125%. All text is sized in rem, so it all scales. */
export const TEXT_SIZES = ["small", "default", "large", "larger"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export const DENSITIES = ["comfortable", "compact"] as const;
export type Density = (typeof DENSITIES)[number];

export const PAPER_SIDES = ["left", "right"] as const;
export type PaperSide = (typeof PAPER_SIDES)[number];

/** Pages whose sections can be rearranged. */
export const LAYOUT_SURFACES = ["teacherHome", "studentHome"] as const;
export type LayoutSurface = (typeof LAYOUT_SURFACES)[number];

/**
 * Section ids per surface, with their default column. Order here is the
 * default order. Essential sections can be moved but never hidden: they are
 * how people find their work (the teacher's classes, the student's inbox).
 */
export const SURFACE_SECTIONS = {
  teacherHome: {
    stats: { label: "This week", column: "main", essential: false },
    tools: { label: "Teaching tools", column: "main", essential: false },
    classes: { label: "Your classes", column: "main", essential: true },
    recent: { label: "Recently returned", column: "side", essential: false },
    missed: { label: "Most missed", column: "side", essential: false },
  },
  studentHome: {
    progress: { label: "Streak and XP", column: "main", essential: false },
    classes: { label: "Your classes", column: "main", essential: false },
    inbox: { label: "Assignment inbox", column: "main", essential: true },
    planner: { label: "Goal planner", column: "main", essential: false },
  },
} as const satisfies Record<
  LayoutSurface,
  Record<string, { label: string; column: "main" | "side"; essential: boolean }>
>;

export type SectionId<S extends LayoutSurface> = keyof (typeof SURFACE_SECTIONS)[S] & string;
export type Column = "main" | "side";

/** Where each section of a surface goes: two ordered columns plus the hidden set. */
export type SectionLayout = { main: string[]; side: string[]; hidden: string[] };

export type Preferences = {
  theme: Theme;
  accent: Accent;
  textSize: TextSize;
  density: Density;
  /** Single-letter shortcuts in To review (J, K, A, S, ?). WCAG 2.1.4: users can turn them off. */
  singleKeyShortcuts: boolean;
  layout: {
    teacherHome: SectionLayout;
    studentHome: SectionLayout;
    /** Class ids in the order the user arranged their class cards (and drawer list). */
    classOrder: string[];
    /** Which side the paper sits on in To review (wide screens). */
    reviewPaperSide: PaperSide;
  };
};

export function defaultSectionLayout(surface: LayoutSurface): SectionLayout {
  const entries = Object.entries(SURFACE_SECTIONS[surface]) as [string, { column: Column }][];
  return {
    main: entries.filter(([, s]) => s.column === "main").map(([id]) => id),
    side: entries.filter(([, s]) => s.column === "side").map(([id]) => id),
    hidden: [],
  };
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  accent: "blue",
  textSize: "default",
  density: "comfortable",
  singleKeyShortcuts: true,
  layout: {
    teacherHome: defaultSectionLayout("teacherHome"),
    studentHome: defaultSectionLayout("studentHome"),
    classOrder: [],
    reviewPaperSide: "left",
  },
};

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

/** The data-* attributes the root <html> carries so CSS can theme everything (including portals). */
export function htmlAttributes(prefs: Pick<Preferences, "theme" | "accent" | "textSize" | "density">) {
  return {
    "data-theme": prefs.theme,
    "data-accent": prefs.accent,
    "data-text-size": prefs.textSize,
    "data-density": prefs.density,
  } as const;
}
