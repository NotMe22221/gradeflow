import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { SCREENSHOTS } from "../src/components/landing/screenshots";
import { DEFAULT_PREFERENCES } from "@/lib/preferences/schema";

// Guards for the landing page: real screenshots that exist in both themes and
// stay small, plain copy without AI tropes, theme tokens instead of fixed
// colors, and a capture script that never changes a grade.

const ROOT = join(import.meta.dirname, "..");
const LANDING_DIR = join(ROOT, "src/components/landing");
const LANDING_FILES = [
  "src/app/page.tsx",
  ...readdirSync(LANDING_DIR)
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => `src/components/landing/${name}`),
];

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

/** Pixel size of a WebP file (lossy VP8, lossless VP8L or extended VP8X). */
function webpSize(file: Buffer): { width: number; height: number } {
  assert.equal(file.toString("ascii", 0, 4), "RIFF");
  assert.equal(file.toString("ascii", 8, 12), "WEBP");
  const chunk = file.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return { width: 1 + file.readUIntLE(24, 3), height: 1 + file.readUIntLE(27, 3) };
  }
  if (chunk === "VP8 ") {
    return { width: file.readUInt16LE(26) & 0x3fff, height: file.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    const bits = file.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  throw new Error(`Unknown WebP chunk ${chunk}`);
}

describe("landing screenshots", () => {
  for (const [id, shot] of Object.entries(SCREENSHOTS)) {
    it(`${id} has light and dark files under 400 KB at the recorded size`, () => {
      for (const src of [shot.light, shot.dark]) {
        assert.match(src, /^\/landing\/[a-z-]+-(light|dark)\.webp$/);
        const path = join(ROOT, "public", src);
        assert.ok(existsSync(path), `${src} exists`);
        assert.ok(statSync(path).size < 400 * 1024, `${src} is under 400 KB`);
        assert.deepEqual(webpSize(readFileSync(path)), { width: shot.width, height: shot.height }, src);
      }
      assert.ok(shot.cssWidth > 0 && shot.cssWidth <= shot.width, "css width is at most the pixel width");
    });

    it(`${id} has alt text that says what is on screen`, () => {
      assert.ok(shot.alt.length >= 40, "alt text is descriptive");
      assert.doesNotMatch(shot.alt, /^(an? )?(image|screenshot|picture) of/i);
    });
  }

  it("every screenshot the page uses is captured", () => {
    const used = new Set<string>();
    for (const path of LANDING_FILES) {
      for (const match of read(path).matchAll(/\b(?:id|small|shot)[=:]\s*"([a-zA-Z]+)"/g)) used.add(match[1]);
    }
    for (const id of ["review", "reviewPhone", "collect", "firstPass", "returned", "studentTodo", "studentHome", "studentGoal", "teacherHome"]) {
      assert.ok(id in SCREENSHOTS, `${id} is in the manifest`);
      assert.ok(used.has(id), `${id} is shown on the page`);
    }
  });
});

describe("landing copy and styling", () => {
  for (const path of LANDING_FILES) {
    it(`${path} avoids AI tropes and hard-coded colors`, () => {
      const source = read(path);
      assert.doesNotMatch(source, /\b(supercharge|unlock|revolutioni[sz]e|seamless|effortless|game[- ]chang|cutting[- ]edge|magic)/i);
      // No AI glyphs: an icon says what a thing does.
      assert.doesNotMatch(source, /\b(Sparkles?|Wand\w*|Bot|Brain\w*|Robot)\b/);
      assert.doesNotMatch(source, /\b(bg|text|border|ring|fill|stroke|from|to|via)-(white|black|(gray|slate|zinc|neutral|stone|indigo|purple|violet)-\d+)\b/);
      assert.doesNotMatch(source, /\[#[0-9a-fA-F]{3,8}\]/, "an arbitrary hex color");
      assert.doesNotMatch(source, /backdrop-blur|bg-clip-text|rotate-[xy]|perspective/, "glass, gradient text or tilted devices");
      // Text sizes stay in rem so the text-size setting scales them.
      assert.doesNotMatch(source, /text-\[\d+(\.\d+)?px\]/);
    });
  }

  it("the page runs top to bottom in the planned order", () => {
    const page = read("src/app/page.tsx");
    const order = ["<Hero", "<HowItWorks", "<Features", "<DeliberatelySmall", "<StudentSide", "<ApprovalGate", "<Accessibility", "<Faq", "<FinalCta"];
    const positions = order.map((tag) => page.indexOf(tag));
    positions.forEach((position, index) => assert.ok(position > 0, `${order[index]} is rendered`));
    assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  });

  it("the header and the calls to action keep both demo doors", () => {
    const header = read("src/components/landing/site-header.tsx");
    assert.match(header, /role="teacher"[^>]*>\s*View the demo/);
    assert.match(header, /role="student"[^>]*>\s*See the student view/);
    const ctas = read("src/components/landing/demo-ctas.tsx");
    assert.match(ctas, /role="teacher"[^>]*>\s*View the demo/);
    assert.match(ctas, /role="student"[^>]*>\s*See the student view/);
  });

  it("every header link points at a section on the page", () => {
    const header = read("src/components/landing/site-header.tsx");
    const all = LANDING_FILES.map(read).join("\n");
    const hrefs = [...header.matchAll(/href: "#([a-z-]+)"/g)].map((match) => match[1]);
    assert.ok(hrefs.length >= 4);
    for (const id of hrefs) assert.ok(all.includes(`id="${id}"`), `#${id} exists`);
  });

  it("the approval promise is on the page in plain words", () => {
    const all = LANDING_FILES.map(read).join("\n").replace(/\s+/g, " ");
    assert.ok(all.includes("Nothing reaches a student until you approve it"));
    assert.ok(all.includes("no API key needed"));
    assert.ok(all.includes("made up"), "says the demo data is synthetic");
  });
});

describe("capture script", () => {
  const script = read("scripts/capture-screenshots.mjs");

  it("never presses a button that changes a grade or a student's work", () => {
    const names = [...script.matchAll(/name: (\/[^/]+\/[a-z]*|"[^"]+")/g)].map((match) => match[1]);
    assert.ok(names.length > 5);
    for (const name of names) {
      assert.doesNotMatch(name, /approve|send back|return|turn in|plan it|study session|grade with|add submission/i, name);
    }
  });

  it("only creates its own assignment and writes only its own files", () => {
    assert.match(script, /const ASSIGNMENT_TITLE = "Persuasive Essay: Should Cedar Ridge Start the Day Later\?"/);
    assert.match(script, /join\(ROOT, "public\/landing"\)/);
    assert.match(script, /join\(ROOT, "src\/components\/landing\/screenshots\.ts"\)/);
    assert.equal([...script.matchAll(/writeFile\(/g)].length, 2);
  });

  it("shoots the default look, so the screenshots match what a visitor sees", () => {
    const pinned = (attribute: string) => script.match(new RegExp(`setAttribute\\("data-${attribute}", "([a-z]+)"\\)`))?.[1];
    assert.equal(pinned("accent"), DEFAULT_PREFERENCES.accent);
    assert.equal(pinned("text-size"), DEFAULT_PREFERENCES.textSize);
    assert.equal(pinned("density"), DEFAULT_PREFERENCES.density);
    assert.equal(pinned("look"), DEFAULT_PREFERENCES.look);
  });
});
