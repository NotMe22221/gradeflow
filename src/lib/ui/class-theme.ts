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

/** Small words that give a class no initial unless they end its name ("History of Art" -> "HA", "Biology A" -> "BA"). */
const MINOR_WORDS = new Set(["a", "an", "and", "at", "for", "in", "of", "on", "the", "to", "with"]);

/** Roman numerals after the first word ("Spanish II"), read as the digit they stand for. */
const ROMAN = new Map(
  ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"].map((numeral, index) => [numeral, String(index + 1)])
);

/** Characters narrow enough to sit two to a small circle: Latin, Greek and Cyrillic letters, and digits. */
const PAIRABLE = /^[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{Nd}]$/u;

function upper(char: string): string {
  const result = char.toUpperCase();
  // "ß" upper-cases to "SS": keep one character per slot.
  return [...result].length === 1 ? result : char;
}

/**
 * Two characters for a class avatar, so classes that share a first letter
 * still look different (in the navigation rail the avatar stands alone):
 * the first character of the first two words ("English 10" -> "E1",
 * "Environmental Science" -> "ES", "History of Art" -> "HA", "Spanish II" ->
 * "S2"), or the first two letters of a one-word name ("Biology" -> "BI").
 * Scripts with wide characters (Chinese, Japanese, Korean...) keep one.
 */
export function classInitial(name: string): string {
  // Each word as its letters and digits (apostrophes, accents and other marks dropped).
  const words = name
    .replace(/['’]/g, "")
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .map((word) => [...word].filter((char) => /[\p{L}\p{N}]/u.test(char)))
    .filter((chars) => chars.length > 0)
    .filter(
      (chars, index, all) => index === 0 || index === all.length - 1 || !MINOR_WORDS.has(chars.join("").toLowerCase())
    );
  if (words.length === 0) return "C";
  const first = words[0][0];
  const second = words.length > 1 ? (ROMAN.get(words[1].join("").toLowerCase()) ?? words[1][0]) : words[0][1];
  if (!second || !PAIRABLE.test(first) || !PAIRABLE.test(second)) return upper(first);
  return upper(first) + upper(second);
}
