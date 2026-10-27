import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

// Guards for the public face of Markwise: the landing page, the logo,
// the root metadata, and the 404 page.

const ROOT = join(import.meta.dirname, "..");
const LANDING_DIR = join(ROOT, "src/components/landing");

const BRAND_FILES = [
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "src/app/not-found.tsx",
  "src/components/brand/logo.tsx",
  ...readdirSync(LANDING_DIR)
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => `src/components/landing/${name}`),
];

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

/** JSX text spread across lines reads as one sentence once whitespace is collapsed. */
function collapse(text: string): string {
  return text.replace(/\s+/g, " ");
}

describe("brand surfaces", () => {
  it("covers the landing components", () => {
    assert.ok(BRAND_FILES.includes("src/components/landing/features.tsx"));
    assert.ok(BRAND_FILES.length >= 10);
  });

  for (const path of BRAND_FILES) {
    it(`${path} uses the Markwise name, no emoji, and no model ids`, () => {
      const source = read(path);
      assert.doesNotMatch(source, /GradeFlow/, "the old product name");
      assert.doesNotMatch(source, /\p{Extended_Pictographic}/u, "emoji");
      // Model ids live only in src/lib/ai/openai.ts; marketing copy may say "GPT-4o".
      assert.doesNotMatch(source, /gpt-4o/, "a hard-coded model id");
      assert.doesNotMatch(source, /bg-(linear|radial|conic|gradient)-/, "a gradient background");
    });
  }

  it("metadata names the product", () => {
    const layout = read("src/app/layout.tsx");
    assert.match(layout, /default: "Markwise/);
    assert.match(layout, /template: "%s · Markwise"/);
    assert.match(collapse(layout), /Markwise bridges paper classrooms and digital grading/);
  });

  it("the landing page explains which engines run, honestly", () => {
    const features = collapse(read("src/components/landing/features.tsx"));
    assert.ok(
      features.includes(
        "Uses Claude for essays, handwriting, briefs and goals when an Anthropic API key is set (GPT-4o reads photos instead if an OpenAI key is set); without keys, labelled demo engines run locally."
      )
    );
  });

  it("the landing page keeps the approval promise and both demo doors", () => {
    const hero = collapse(read("src/components/landing/hero.tsx"));
    assert.match(hero, /AI drafts the first pass\. You make the call\./);
    assert.match(hero, /handwritten tests/);
    const ctas = read("src/components/landing/demo-ctas.tsx");
    assert.match(ctas, /role="teacher"/);
    assert.match(ctas, /role="student"/);
    assert.match(ctas, /See the student view/);
  });

  it("the page renders the features, approval gate, and scope sections", () => {
    const page = read("src/app/page.tsx");
    for (const section of ["<Hero", "<Features", "<HowItWorks", "<ApprovalGate", "<DeliberatelySmall", "<FinalCta"]) {
      assert.ok(page.includes(section), section);
    }
  });

  it("the scope section still lists what Markwise deliberately skips", () => {
    const small = read("src/components/landing/deliberately-small.tsx");
    for (const skipped of ["Discussion boards", "Messaging", "Calendars", "Video", "Attendance", "Course marketplaces"]) {
      assert.ok(small.includes(`"${skipped}"`), skipped);
    }
  });
});
