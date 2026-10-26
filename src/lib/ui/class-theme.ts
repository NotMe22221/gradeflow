// Class theme colors and banner motifs, in the style of Google Classroom.
// Each class gets a stable color from its id, and a banner motif from its
// subject. Pure: safe for server and client components.

export const CLASS_THEMES = [
  { key: "blue", color: "var(--class-blue)", hex: "#1967d2" },
  { key: "green", color: "var(--class-green)", hex: "#137333" },
  { key: "purple", color: "var(--class-purple)", hex: "#8430ce" },
  { key: "teal", color: "var(--class-teal)", hex: "#007b83" },
  { key: "orange", color: "var(--class-orange)", hex: "#c26401" },
  { key: "pink", color: "var(--class-pink)", hex: "#b80672" },
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
