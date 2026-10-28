// Guards for the teacher class pages, assignment pages, gradebook and grading
// badges: theme-safe colors only (so dark mode holds), no "AI" glyphs, and
// status labels that pair a word with an icon (color is never the only signal).

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import TeacherError from "@/app/(teacher)/error";
import { CELL_DISPLAY, LEGEND_KEYS } from "@/components/gradebook/cell-display";
import { StatusBadge } from "@/components/grading/status-badge";
import { SUBMISSION_STATUSES } from "@/lib/constants";

const ROOT = join(import.meta.dirname, "..");

const AREAS = [
  "src/app/(teacher)/classes/[classId]",
  "src/app/(teacher)/assignments",
  "src/app/(teacher)/gradebook",
  "src/app/(teacher)/error.tsx",
  "src/components/classwork",
  "src/components/assignments",
  "src/components/gradebook",
  "src/components/grading",
  "src/components/classes/class-stream.tsx",
  "src/components/classes/people-list.tsx",
  "src/components/classes/status-summary.tsx",
  "src/components/classes/form-feedback.tsx",
  "src/components/classes/add-student-dialog.tsx",
  "src/components/classes/new-class-dialog.tsx",
];

function sources(): { path: string; source: string }[] {
  const out: { path: string; source: string }[] = [];
  const visit = (path: string) => {
    if (statSync(path).isDirectory()) {
      for (const name of readdirSync(path)) visit(join(path, name));
    } else if (/\.(tsx?|css)$/.test(path)) {
      out.push({ path: relative(ROOT, path), source: readFileSync(path, "utf8") });
    }
  };
  for (const area of AREAS) visit(join(ROOT, area));
  return out;
}

describe("teacher pages: theme-safe colors", () => {
  const files = sources();

  it("finds the files it guards", () => {
    assert.ok(files.length > 30, `only ${files.length} files found`);
  });

  for (const { path, source } of files) {
    it(`${path} uses tokens, not fixed colors`, () => {
      // Palette utilities and fixed black/white fills break in dark mode (white text is checked below).
      assert.doesNotMatch(source, /\b(bg|border|ring|fill|stroke|from|via|to|shadow|outline|divide)-(black|white)\b/);
      assert.doesNotMatch(source, /\btext-black\b/);
      assert.doesNotMatch(source, /\b(bg|text|border|ring|fill|stroke|from|via|to|shadow|outline|divide)-(gray|zinc|slate|neutral|stone|indigo|violet|purple)\b/);
      assert.doesNotMatch(source, /\b(bg|text|border|ring|fill|stroke|from|via|to|shadow|outline|divide)-(black|white|gray|zinc|slate|neutral|stone|indigo|violet|purple)-?\d/);
      // Hex and rgb()/hsl() literals in class names or styles.
      assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b(?![\w-])/);
      assert.doesNotMatch(source, /\b(rgb|rgba|hsl|hsla)\(/);
      // White text belongs only on a class-color fill (the assignment icon circle).
      if (!path.endsWith("classwork/assignment-icon.tsx")) assert.doesNotMatch(source, /\btext-white\b/);
    });

    it(`${path} has no "AI" glyphs`, () => {
      assert.doesNotMatch(source, /\b(Sparkles?|Wand\w*|WandSparkles|Bot|BrainCircuit|Brain|AutoAwesome|SmartToy|Psychology|Neurology)\b/);
      assert.doesNotMatch(source, /auto_awesome|magic_button|wand_stars|smart_toy|"psychology"|"neurology"/);
    });
  }
});

describe("grading badges", () => {
  for (const status of SUBMISSION_STATUSES) {
    it(`${status} pairs an icon with a word`, () => {
      const html = renderToStaticMarkup(createElement(StatusBadge, { status }));
      assert.match(html, /<svg[^>]*aria-hidden="true"/, "has a decorative icon");
      const text = html.replace(/<[^>]+>/g, "").trim();
      assert.ok(text.length > 2, `has a label (got "${text}")`);
    });
  }

  it("a draft reads Needs review, with the edit-note icon", () => {
    const html = renderToStaticMarkup(createElement(StatusBadge, { status: "NEEDS_REVIEW" }));
    assert.match(html, /Needs review/);
    assert.match(html, /data-icon="edit_note"/);
  });
});

describe("grades legend", () => {
  it("names a draft by what it is and never shows it as a score", () => {
    const draft = CELL_DISPLAY.in_review;
    assert.equal(draft.label, "Needs review");
    assert.equal(draft.look.kind, "chip");
    assert.match(draft.legend, /suggested score/i);
    assert.doesNotMatch(draft.legend, /\bAI draft\b/);
  });

  it("every legend entry has a visible word or a score sample", () => {
    for (const key of LEGEND_KEYS) assert.ok(CELL_DISPLAY[key].legend.length > 0, key);
  });
});

describe("teacher error page", () => {
  const error = Object.assign(new Error("connect ECONNREFUSED db.internal:5432 password=hunter2"), { digest: "3929235505" });
  const html = renderToStaticMarkup(createElement(TeacherError, { error, retry: () => {} }));

  it("stays plain: no message, stack or digest", () => {
    const frame = error.stack?.split("\n")[1]?.trim() ?? "";
    for (const leak of ["ECONNREFUSED", "hunter2", "3929235505", frame]) assert.ok(leak && !html.includes(leak), leak);
    assert.match(html, /Something went wrong loading this page\./);
  });

  it("offers Try again and a way Home", () => {
    assert.match(html, /<button[^>]*type="button"[^>]*>[\s\S]*?Try again<\/button>/);
    assert.deepEqual([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]), ["/dashboard"]);
  });

  it("renders inside the app shell: no header or main of its own", () => {
    assert.doesNotMatch(html, /<(header|main)\b/);
  });
});

/**
 * The awaited server action sits in a try, and its catch hands Next's own
 * signals (a redirect) back before telling the teacher the server was out of
 * reach, so a dropped connection never replaces the page with an error screen.
 */
function assertCaught(source: string, action: string) {
  const call = source.indexOf(`await ${action}(`);
  assert.ok(call > 0, `${action} is awaited`);
  const tryAt = source.lastIndexOf("try {", call);
  assert.ok(tryAt > 0 && !source.slice(tryAt, call).includes("} catch"), `${action} is inside a try`);
  const handler = source.slice(source.indexOf("} catch (error) {", call));
  assert.match(handler, /^\} catch \(error\) \{\s*(?:\/\/[^\n]*\s*)*unstable_rethrow\(error\);\s*[^\n]*Couldn't reach the server/);
}

describe("server actions on a dropped connection", () => {
  const cases = [
    ["src/components/classes/new-class-dialog.tsx", "createClass"],
    ["src/components/classes/add-student-dialog.tsx", "addStudent"],
    ["src/components/assignments/add-submission-dialog.tsx", "addSubmission"],
    // These two answer with a toast: the builder's form alert can be scrolled off screen, and
    // loading samples has no form.
    ["src/components/assignments/rubric-builder.tsx", "createAssignment"],
    ["src/components/assignments/load-samples.tsx", "loadSamplePapers"],
  ] as const;
  for (const [path, action] of cases) {
    it(`${action} shows a message instead of the error screen`, () => {
      const source = readFileSync(join(ROOT, path), "utf8");
      assert.match(source, /import \{[^}]*\bunstable_rethrow\b[^}]*\} from "next\/navigation";/);
      assertCaught(source, action);
    });
  }
});
