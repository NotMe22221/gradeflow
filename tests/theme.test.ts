import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { ACCENT_OPTIONS, TEXT_SIZE_OPTIONS, THEME_COLOR, THEME_OPTIONS } from "@/components/customize/options";
import { ACCENTS, TEXT_SIZES, THEMES } from "@/lib/preferences/schema";
import { CLASS_THEMES } from "@/lib/ui/class-theme";

// Guards for the theme: every token pair in src/app/globals.css meets WCAG
// contrast in light and dark, for every accent, and the class colors carry
// their text. The ratios are computed from the CSS itself, so changing a
// value there is enough to re-check it.
//
// Measured when written (blue accent; light / dark):
//   foreground on background 15.8 / 14.5, on card 16.5 / 12.9
//   muted-foreground on card 6.8 / 9.7, on popover 6.8 / 8.5, on secondary 6.0 / 7.2
//   primary on background 6.1 / 10.8, primary-foreground on primary 6.4 / 7.5
//   primary-soft-foreground on primary-soft 12.6 / 7.0, ring on card 6.4 / 9.6, input on card 4.5 / 5.2
//   success, danger, warning on card 6.5, 6.5, 5.0 / 9.1, 9.7, 9.7
//   status -soft-foreground on -soft 7.2-7.3 / 9.3-10.0, paper-foreground on paper 16.5 / 13.4
// Every accent (teal, green, orange, pink, slate) is within 0.4 of blue: primary on
// surfaces 6.2 / 9.7, on-primary 6.5 / 7.7, soft 13.2-13.5 / 7.2-7.4.
// Class colors: white on the fill 5.4-6.4 (light) / 9.3-9.4 (dark tone 30);
// the accent on cards 5.4-6.4 / 9.7 (dark tone 80).

const ROOT = join(import.meta.dirname, "..");
const CSS = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");

// --- Parsing ---------------------------------------------------------------------

/** The declarations of the first rule whose selector text is exactly `selector`. */
function block(selector: string): Record<string, string> {
  const start = CSS.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `no rule for ${selector}`);
  const open = CSS.indexOf("{", start + selector.length);
  const close = CSS.indexOf("}", open);
  const body = CSS.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, "");
  const out: Record<string, string> = {};
  for (const decl of body.split(";")) {
    const match = decl.match(/^\s*(--[\w-]+|color-scheme)\s*:\s*([\s\S]+?)\s*$/);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

const LIGHT = block(":where(:root)"); // the first plain :root rule is the light theme
const DARK = block(':where(:root[data-theme="dark"])');
const SYSTEM_DARK = block(':where(:root:not([data-theme="light"], [data-theme="dark"]))');
const PALETTES = Object.fromEntries(
  ACCENTS.map((accent) => [
    accent,
    block(accent === "blue" ? ':where(:root),\n:where([data-accent="blue"])' : `:where([data-accent="${accent}"])`),
  ])
) as Record<(typeof ACCENTS)[number], Record<string, string>>;

type Scheme = Record<string, string>;

/** Light or dark tokens with one accent's palette, every var() resolved to a hex color. */
function scheme(theme: "light" | "dark", accent: (typeof ACCENTS)[number]): Scheme {
  const raw = { ...PALETTES[accent], ...LIGHT, ...(theme === "dark" ? DARK : {}) };
  const resolve = (value: string, depth = 0): string => {
    const ref = value.match(/^var\((--[\w-]+)\)$/);
    if (!ref) return value;
    assert.ok(depth < 5 && raw[ref[1]], `unresolved ${value}`);
    return resolve(raw[ref[1]], depth + 1);
  };
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, resolve(value)]));
}

// --- WCAG contrast ------------------------------------------------------------------

function luminance(hex: string): number {
  const match = hex.match(/^#([0-9a-f]{6})$/i);
  assert.ok(match, `not a 6-digit hex color: ${hex}`);
  const n = parseInt(match[1], 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const SURFACES = ["--background", "--card", "--popover"];

/** [foreground token, background tokens, minimum ratio] */
const PAIRS: [string, string[], number][] = [
  ["--foreground", [...SURFACES, "--secondary", "--muted", "--accent", "--surface-bright", "--highlight", "--highlight-strong"], 4.5],
  ["--muted-foreground", [...SURFACES, "--secondary", "--muted", "--accent", "--surface-bright", "--primary-soft"], 4.5],
  ["--card-foreground", ["--card"], 4.5],
  ["--popover-foreground", ["--popover"], 4.5],
  ["--secondary-foreground", ["--secondary"], 4.5],
  ["--accent-foreground", ["--accent"], 4.5],
  ["--primary", [...SURFACES, "--secondary"], 4.5],
  ["--primary-foreground", ["--primary"], 4.5],
  ["--primary-soft-foreground", ["--primary-soft", "--surface-bright"], 4.5],
  ["--sidebar-foreground", ["--sidebar"], 4.5],
  ["--sidebar-accent-foreground", ["--sidebar-accent"], 4.5],
  ["--sidebar-primary-foreground", ["--sidebar-primary"], 4.5],
  ["--destructive", SURFACES, 4.5],
  ["--destructive-foreground", ["--destructive"], 4.5],
  ["--success", SURFACES, 4.5],
  ["--success-foreground", ["--success"], 4.5],
  ["--success-soft-foreground", ["--success-soft"], 4.5],
  ["--danger", SURFACES, 4.5],
  ["--danger-foreground", ["--danger"], 4.5],
  ["--danger-soft-foreground", ["--danger-soft"], 4.5],
  ["--warning-foreground", ["--warning"], 4.5],
  ["--warning-soft-foreground", ["--warning-soft"], 4.5],
  ["--paper-foreground", ["--paper"], 4.5],
  // Non-text: focus rings, field outlines, status icons (WCAG 1.4.11).
  ["--ring", [...SURFACES, "--primary-soft", "--secondary"], 3],
  ["--sidebar-ring", ["--sidebar"], 3],
  ["--input", SURFACES, 3],
  ["--warning", SURFACES, 3],
  ["--muted-foreground", ["--highlight"], 4.5],
  // The Bold look: text on a pop fill or section band, and decor marks on the canvas.
  ["--pop-ink-on", ["--pop-yellow", "--pop-coral", "--pop-mint", "--pop-sky", "--pop-pink", "--pop-lilac"], 4.5],
  ["--band-foreground", ["--band-yellow", "--band-coral", "--band-mint", "--band-sky", "--band-pink", "--band-lilac"], 4.5],
  ["--pop-ink", ["--background", "--card"], 3],
];

describe("theme tokens", () => {
  it("parses both themes and every accent", () => {
    assert.equal(LIGHT["color-scheme"], "light");
    assert.equal(DARK["color-scheme"], "dark");
    for (const accent of ACCENTS) assert.ok(PALETTES[accent]["--primary-40"], accent);
  });

  it("defines a dark value for every light color token", () => {
    const colorTokens = Object.keys(LIGHT).filter((key) => /^#|^rgb/.test(LIGHT[key]) && key !== "--paper-foreground");
    const missing = colorTokens.filter((key) => !(key in DARK));
    assert.deepEqual(missing, []);
  });

  it("keeps the system-dark block identical to the explicit dark theme", () => {
    assert.deepEqual(SYSTEM_DARK, DARK);
  });

  it("never uses pure black or pure white as the dark canvas or text", () => {
    assert.notEqual(DARK["--background"], "#000000");
    assert.notEqual(DARK["--foreground"], "#ffffff");
  });

  const report: string[] = [];
  for (const theme of ["light", "dark"] as const) {
    for (const accent of ACCENTS) {
      it(`meets contrast minimums in ${theme} with the ${accent} accent`, () => {
        const s = scheme(theme, accent);
        const failures: string[] = [];
        for (const [fg, bgs, min] of PAIRS) {
          for (const bg of bgs) {
            const ratio = contrast(s[fg], s[bg]);
            if (accent === "blue" || /primary|ring|sidebar/.test(fg + bg)) {
              report.push(`${theme} ${accent} ${fg} on ${bg}: ${ratio.toFixed(2)}`);
            }
            if (ratio < min) failures.push(`${fg} (${s[fg]}) on ${bg} (${s[bg]}): ${ratio.toFixed(2)} < ${min}`);
          }
        }
        assert.deepEqual(failures, []);
      });
    }
  }

  it("records the measured ratios", () => {
    // A few anchors from docs/design-2026 (dark on-surface on surface is 14.5:1 there).
    const dark = scheme("dark", "blue");
    const light = scheme("light", "blue");
    assert.ok(contrast(dark["--foreground"], dark["--background"]) > 14);
    assert.ok(contrast(dark["--primary"], dark["--background"]) > 10);
    assert.ok(contrast(light["--primary"], "#ffffff") > 6);
    assert.ok(report.length > 100);
  });
});

describe("class colors", () => {
  for (const theme of ["light", "dark"] as const) {
    const s = scheme(theme, "blue");
    for (const klass of CLASS_THEMES) {
      it(`${klass.key} in ${theme}: white on the fill, accent on surfaces, text on the accent`, () => {
        const fill = s[`--class-${klass.key}`];
        const accent = s[`--class-${klass.key}-accent`];
        const onAccent = s[`--class-${klass.key}-on-accent`];
        assert.ok(contrast("#ffffff", fill) >= 4.5, `white on ${fill}`);
        for (const surface of SURFACES) {
          assert.ok(contrast(accent, s[surface]) >= 4.5, `${accent} on ${surface}`);
        }
        assert.ok(contrast(onAccent, accent) >= 4.5, `${onAccent} on ${accent}`);
      });
    }
  }

  it("CLASS_THEMES mirrors the CSS values", () => {
    for (const klass of CLASS_THEMES) {
      assert.equal(klass.color, `var(--class-${klass.key})`);
      assert.equal(klass.accent, `var(--class-${klass.key}-accent)`);
      assert.equal(klass.onAccent, `var(--class-${klass.key}-on-accent)`);
      assert.equal(LIGHT[`--class-${klass.key}`], klass.hex);
      assert.equal(DARK[`--class-${klass.key}`], klass.darkHex);
      assert.equal(DARK[`--class-${klass.key}-accent`], klass.darkAccentHex);
    }
  });
});

describe("appearance options", () => {
  it("offers every theme, accent and text size the schema allows, with names", () => {
    assert.deepEqual(
      THEME_OPTIONS.map((o) => o.value),
      [...THEMES]
    );
    assert.deepEqual(
      ACCENT_OPTIONS.map((o) => o.value),
      [...ACCENTS]
    );
    assert.deepEqual(
      TEXT_SIZE_OPTIONS.map((o) => o.value),
      [...TEXT_SIZES]
    );
    for (const option of [...THEME_OPTIONS, ...ACCENT_OPTIONS, ...TEXT_SIZE_OPTIONS]) assert.ok(option.label.length > 2);
  });

  it("the browser theme-color matches the app bar surface", () => {
    assert.equal(THEME_COLOR.light, LIGHT["--card"]);
    assert.equal(THEME_COLOR.dark, DARK["--card"]);
  });

  it("scales the root font size for each text size", () => {
    assert.match(CSS, /:where\(:root\[data-text-size="small"\]\) \{\s*font-size: 87\.5%;/);
    assert.match(CSS, /:where\(:root\[data-text-size="large"\]\) \{\s*font-size: 112\.5%;/);
    assert.match(CSS, /:where\(:root\[data-text-size="larger"\]\) \{\s*font-size: 125%;/);
  });

  it("defines comfortable and compact density, and compact never goes under 24px rows", () => {
    const compact = block(':where([data-density="compact"])');
    for (const key of ["--row-pad-y", "--row-min-h", "--cell-pad-y", "--cell-head-h", "--card-pad", "--list-gap", "--section-gap"]) {
      assert.ok(LIGHT[key], `comfortable ${key}`);
      assert.ok(compact[key], `compact ${key}`);
      assert.ok(parseFloat(compact[key]) < parseFloat(LIGHT[key]), `compact ${key} is tighter`);
    }
    assert.ok(parseFloat(compact["--row-min-h"]) * 16 >= 24);
    assert.ok(parseFloat(compact["--cell-head-h"]) * 16 >= 24);
  });

  it("has dark and compact variants and keeps focus clear of the app bar", () => {
    assert.match(CSS, /@custom-variant dark \{/);
    assert.match(CSS, /@custom-variant compact/);
    assert.match(CSS, /scroll-padding-top: calc\(var\(--app-bar-h\)/);
    assert.match(CSS, /@media \(prefers-contrast: more\)/);
  });
});

describe("owned components use tokens, not hard-coded colors", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(name)) files.push(path);
    }
  };
  for (const dir of ["src/components/ui", "src/components/classroom", "src/components/customize"]) walk(join(ROOT, dir));
  files.push(join(ROOT, "src/app/layout.tsx"), join(ROOT, "src/app/not-found.tsx"));

  for (const path of files) {
    const relative = path.slice(ROOT.length + 1);
    // options.ts holds the browser theme-color values, checked against the CSS above.
    if (relative === "src/components/customize/options.ts") continue;
    it(relative, () => {
      const source = readFileSync(path, "utf8");
      assert.doesNotMatch(source, /\b(bg|text|border|ring|fill|stroke|from|to)-(black|gray|zinc|slate|neutral|stone)-?\d*/);
      assert.doesNotMatch(source, /\bbg-white\b/);
      // Hex colors only inside masks (#000 is the mask's opaque value, not a color on screen).
      const hexes = [...source.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => m[0]).filter((hex) => hex !== "#000");
      assert.deepEqual(hexes, []);
    });
  }
});
