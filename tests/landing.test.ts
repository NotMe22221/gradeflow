import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { SCREENSHOTS } from "../src/components/landing/screenshots";
import { baselineVerdict } from "@/lib/eval/metrics";
import type { EvalResults } from "@/lib/eval/ellipse";
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

describe("landing claims match the app", () => {
  const flat = (path: string) => read(path).replace(/\s+/g, " ");

  it("describes To review's default order, not a confidence sort", () => {
    const steps = flat("src/components/landing/how-it-works.tsx");
    assert.doesNotMatch(steps, /least sure/);
    assert.ok(steps.includes("Drafts most worth a second look come first"));
    for (const path of ["src/components/landing/judges.tsx", "src/app/evidence/page.tsx"]) {
      assert.doesNotMatch(flat(path), /only sorts To review/, path);
    }
  });

  it("claims no accuracy the committed evaluation doesn't back", () => {
    const faq = flat("src/components/landing/faq.tsx");
    assert.doesNotMatch(faq, /Good enough to start from/);
    assert.ok(faq.includes("Not measured yet, so always check."));
    // Each sentence holds only while the committed results say so; rerunning the eval must revisit it.
    const demo = JSON.parse(read("eval/results/demo.json")) as EvalResults;
    const live = JSON.parse(read("eval/results/live.json")) as { run: unknown };
    assert.equal(demo.run.grader, "demo");
    assert.notEqual(baselineVerdict(demo.summary, demo.baseline), "beats");
    assert.ok(faq.includes("it does no better than always answering 3"));
    assert.equal(live.run, null);
    assert.ok(faq.includes("The live Claude evaluation hasn&apos;t been run yet"));
  });

  it("says every kind of student data an AI provider receives", () => {
    const faq = flat("src/components/landing/faq.tsx");
    const answer = faq.slice(faq.indexOf("What happens to student work?"), faq.indexOf("What does it cost?"));
    for (const item of ["answer-key photos", "conference brief", "goal text", "goal planner", "In demo mode nothing leaves the server"]) {
      assert.ok(answer.includes(item), item);
    }
  });

  it("labels the hero's drawn score card as an example, not demo output", () => {
    const hero = flat("src/components/landing/hero.tsx");
    const card = hero.slice(hero.indexOf("function SampleScore"));
    assert.doesNotMatch(card, /from the demo/);
    assert.match(card, /aria-label="An illustration of a first pass, not real output:/);
    assert.match(card, />\s*Example\s*</);
  });

  it("names the engines without implying OpenAI needs both keys", () => {
    const features = flat("src/components/landing/features.tsx");
    assert.doesNotMatch(features, /also set/);
    assert.ok(features.includes("An OpenAI key, with or without that one, moves photos to GPT-4o"));
    assert.ok(features.includes("essays always use Claude, or the demo grader when no Anthropic key is set"));
  });

  it("promises nothing that one visitor's grading on the shared demo makes untrue", () => {
    assert.doesNotMatch(flat("src/components/landing/final-cta.tsx"), /four essays/);
    const judges = flat("src/components/landing/judges.tsx");
    assert.ok(judges.includes("(If his quiz is already approved, the photo goes to a classmate; the scanner says who.)"));
    assert.ok(judges.includes("Only now does the student see a grade"));
  });
});

describe("evidence page on a phone", () => {
  const page = read("src/app/evidence/page.tsx");

  it("says its tables scroll sideways, on phones only", () => {
    assert.match(page, /className="mt-6 text-\[0\.8125rem\] text-muted-foreground sm:hidden">Swipe sideways to see every column\./);
    // Both tables go through the scroller that carries the hint.
    assert.equal(page.split("<TableScroll>").length - 1, 2);
    assert.equal(page.split("overflow-x-auto").length - 1, 1);
  });
});

describe("favicon", () => {
  const icon = read("src/app/icon.svg");
  const css = read("src/app/globals.css");
  const pink = css.match(/:where\(\[data-accent="pink"\]\) \{([^}]*)\}/)?.[1] ?? "";
  const tone = (n: number) => pink.match(new RegExp(`--primary-${n}: (#[0-9a-f]{6});`))?.[1];

  it("is the logo mark in the default accent, in light and dark", () => {
    assert.equal(DEFAULT_PREFERENCES.accent, "pink");
    assert.ok(tone(40) && tone(80) && tone(20), "the pink palette is found");
    const [light, dark] = icon.split("@media (prefers-color-scheme: dark)");
    assert.ok(dark, "a dark-scheme block");
    // Light: tone 40 with white strokes; dark: tone 80 with tone 20 strokes, as LogoMark draws it.
    assert.ok(light.includes(`.tile { fill: ${tone(40)}; }`));
    assert.ok(light.includes(".ink { stroke: #ffffff; }"));
    assert.ok(dark.includes(`.tile { fill: ${tone(80)}; }`));
    assert.ok(dark.includes(`.ink { stroke: ${tone(20)}; }`));
  });

  it("draws the same mark as LogoMark", () => {
    const logo = read("src/components/brand/logo.tsx");
    for (const shape of [/<rect width="32" height="32" rx="9"/, /d="M9 11h9\.5M9 15\.5h6"/, /d="M14\.5 21l3\.1 3 6\.9-7\.5"/]) {
      assert.match(logo, shape);
      assert.match(icon.replace('class="tile" ', ""), shape);
    }
    assert.match(icon, /viewBox="0 0 32 32"/);
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
