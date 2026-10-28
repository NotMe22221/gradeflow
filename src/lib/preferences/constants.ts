// Preference choices, types and defaults, and the <html> attributes that show
// them. No validation library here, so client code that only needs these (the
// root Toaster, the global error page, the Customize panel) doesn't ship zod
// on every page. Validation and normalizing live in schema.ts, which
// re-exports everything here.

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

/** "bold": bright paint shapes, patterns and color bands. "calm": the same colors without them. */
export const LOOKS = ["bold", "calm"] as const;
export type Look = (typeof LOOKS)[number];

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
  look: Look;
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
  accent: "pink",
  textSize: "default",
  density: "comfortable",
  look: "bold",
  singleKeyShortcuts: true,
  layout: {
    teacherHome: defaultSectionLayout("teacherHome"),
    studentHome: defaultSectionLayout("studentHome"),
    classOrder: [],
    reviewPaperSide: "left",
  },
};

/** The data-* attributes the root <html> carries so CSS can theme everything (including portals). */
export function htmlAttributes(prefs: Pick<Preferences, "theme" | "accent" | "textSize" | "density" | "look">) {
  return {
    "data-theme": prefs.theme,
    "data-accent": prefs.accent,
    "data-text-size": prefs.textSize,
    "data-density": prefs.density,
    "data-look": prefs.look,
  } as const;
}
