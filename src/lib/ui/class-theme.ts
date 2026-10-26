// Class theme colors and banner motifs, in the style of Google Classroom.
// Each class gets a stable color from its name, and a banner motif from its
// subject. Pure: safe for server and client components.

/**
 * Class colors, as CSS variables that switch with the theme (no JavaScript,
 * so server-rendered banners are right on first paint):
 *
 * - `color`: a fill for banners, avatars and icon circles that carries white
 *   text at 4.5:1 or better. Light uses the classic Classroom tone; dark uses a
 *   darker, calmer tone 30 (never an inverted pastel).
 * - `accent` / `onAccent`: the class color for dots, rules, links and text on
 *   ordinary surfaces (4.5:1 on cards in both themes), and the text to put on
 *   an `accent` fill. In light they equal `color` / white; in dark `accent` is
 *   tone 80 and `onAccent` tone 20.
 *
 * The hex values mirror the --class-* tokens in src/app/globals.css
 * (tests/theme.test.ts checks the two stay in sync and measures contrast).
 */
export const CLASS_THEMES = [
  {
    key: "blue",
    color: "var(--class-blue)",
    accent: "var(--class-blue-accent)",
    onAccent: "var(--class-blue-on-accent)",
    hex: "#1967d2",
    darkHex: "#2b4678",
    darkAccentHex: "#adc6ff",
  },
  {
    key: "green",
    color: "var(--class-green)",
    accent: "var(--class-green-accent)",
    onAccent: "var(--class-green-on-accent)",
    hex: "#137333",
    darkHex: "#1c5128",
    darkAccentHex: "#87d991",
  },
  {
    key: "purple",
    color: "var(--class-purple)",
    accent: "var(--class-purple-accent)",
    onAccent: "var(--class-purple-on-accent)",
    hex: "#8430ce",
    darkHex: "#563a70",
    darkAccentHex: "#deb7ff",
  },
  {
    key: "teal",
    color: "var(--class-teal)",
    accent: "var(--class-teal-accent)",
    onAccent: "var(--class-teal-on-accent)",
    hex: "#00707a",
    darkHex: "#004f56",
    darkAccentHex: "#81d3de",
  },
  {
    key: "orange",
    color: "var(--class-orange)",
    accent: "var(--class-orange-accent)",
    onAccent: "var(--class-orange-on-accent)",
    hex: "#a35200",
    darkHex: "#6d390c",
    darkAccentHex: "#ffb784",
  },
  {
    key: "pink",
    color: "var(--class-pink)",
    accent: "var(--class-pink-accent)",
    onAccent: "var(--class-pink-on-accent)",
    hex: "#b80672",
    darkHex: "#6e334e",
    darkAccentHex: "#ffb0cf",
  },
] as const;

export type ClassTheme = (typeof CLASS_THEMES)[number];

export type BannerMotif = "books" | "science" | "math" | "default";

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Theme for a class. Seeded by the class name so a class keeps its color
 * across re-seeds (ids change, names don't).
 */
export function classTheme(klass: { name: string }): ClassTheme {
  const name = klass.name.trim().toLowerCase();
  // The demo classes get distinct, intentional colors.
  if (/^english/.test(name)) return CLASS_THEMES[0];
  if (/science|biology|chem|physics|environment/.test(name)) return CLASS_THEMES[1];
  return CLASS_THEMES[hash(name) % CLASS_THEMES.length];
}

export function bannerMotif(klass: { name: string; subject?: string | null }): BannerMotif {
  const text = `${klass.subject ?? ""} ${klass.name}`.toLowerCase();
  if (/english|language|literature|writing|reading|history|social/.test(text)) return "books";
  if (/science|biology|chem|physics|environment|lab/.test(text)) return "science";
  if (/math|algebra|geometry|calculus|statistics/.test(text)) return "math";
  return "default";
}

/** One or two letters for a class avatar ("English 10" -> "E"). */
export function classInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "C";
}
