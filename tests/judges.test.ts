import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  CHECKED_ON,
  COMPETITORS,
  DEMO_SCRIPT_URL,
  DIMENSION_GROUPS,
  DIMENSION_KEYS,
  DIMENSIONS,
  MARKWISE,
  PRODUCTS,
  REAL_AND_MOCKED_URL,
  STATUS_LABELS,
  STATUSES,
  hostOf,
  sourcesFor,
  topicsOf,
} from "@/components/landing/comparison-data";
import { ComparisonTable } from "@/components/landing/comparison-table";

// Guards for the landing page's "For judges" section: the comparison data
// stays complete and sourced, Markwise's own column stays honest, and the
// table keeps its semantics (caption, header scopes, an icon and a word in
// every cell).

const ROOT = join(import.meta.dirname, "..");

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

/** JSX text spread across lines reads as one sentence once whitespace is collapsed. */
function collapse(text: string): string {
  return text.replace(/\s+/g, " ");
}

const sorted = (values: readonly string[]) => [...values].sort();

describe("judges comparison data", () => {
  it("records the day the competitor pages were checked", () => {
    assert.equal(CHECKED_ON, "October 27, 2026");
  });

  it("defines fifteen dimensions, each with a short label, the full question and a topic", () => {
    assert.equal(DIMENSIONS.length, 15);
    assert.deepEqual(
      DIMENSIONS.map((dimension) => dimension.key),
      [...DIMENSION_KEYS],
    );
    for (const dimension of DIMENSIONS) {
      assert.ok(dimension.short.length > 0 && dimension.short.length <= 40, `${dimension.key} short label`);
      assert.ok(dimension.label.length >= dimension.short.length / 2, `${dimension.key} full label`);
      assert.ok(dimension.topic.length > 0, `${dimension.key} topic`);
    }
  });

  it("gives every dimension exactly one row in the table's groups", () => {
    const grouped = DIMENSION_GROUPS.flatMap((group) => group.keys);
    assert.equal(new Set(grouped).size, grouped.length, "no dimension appears twice");
    assert.deepEqual(sorted(grouped), sorted(DIMENSION_KEYS));
  });

  it("compares Markwise, first, with six distinct competitors", () => {
    assert.equal(PRODUCTS[0], MARKWISE);
    assert.equal(COMPETITORS.length, 6);
    assert.equal(new Set(PRODUCTS.map((product) => product.key)).size, PRODUCTS.length);
    assert.deepEqual(
      COMPETITORS.map((product) => product.name),
      ["Gradescope", "CoGrader", "Brisk Teaching", "MagicSchool", "Google Classroom (with Gemini)", "EssayGrader"],
    );
  });

  it("gives every product a cell for every dimension, and nothing else", () => {
    for (const product of PRODUCTS) {
      assert.deepEqual(sorted(Object.keys(product.cells)), sorted(DIMENSION_KEYS), product.name);
      for (const key of DIMENSION_KEYS) {
        const cell = product.cells[key];
        assert.ok(STATUSES.includes(cell.status), `${product.name} ${key} status`);
        assert.ok(cell.note.trim().length > 0, `${product.name} ${key} has a note`);
        assert.ok(cell.note.length <= 160, `${product.name} ${key} note stays short`);
      }
    }
  });

  it("backs every competitor yes, partial and no with a source page", () => {
    for (const product of COMPETITORS) {
      for (const key of DIMENSION_KEYS) {
        const cell = product.cells[key];
        if (cell.status === "unknown") continue;
        assert.ok(cell.sourceUrl, `${product.name} ${key} (${cell.status}) has a source`);
      }
    }
  });

  it("links only to https pages, and Markwise's own column to its README", () => {
    for (const product of PRODUCTS) {
      assert.equal(new URL(product.officialUrl).protocol, "https:", product.name);
      for (const key of DIMENSION_KEYS) {
        const url = product.cells[key].sourceUrl;
        if (url) assert.equal(new URL(url).protocol, "https:", `${product.name} ${key}`);
      }
    }
    for (const key of DIMENSION_KEYS) {
      assert.match(MARKWISE.cells[key].sourceUrl, /^https:\/\/github\.com\/NotMe22221\/gradeflow#/, key);
    }
    assert.equal(DEMO_SCRIPT_URL, "https://github.com/NotMe22221/gradeflow#demo-script-about-3-minutes");
    assert.equal(REAL_AND_MOCKED_URL, "https://github.com/NotMe22221/gradeflow#whats-real-and-whats-mocked");
  });

  it("shows each status as a word, and unknown as Not stated", () => {
    assert.deepEqual(STATUS_LABELS, { yes: "Yes", partial: "Partial", no: "No", unknown: "Not stated" });
  });

  it("keeps Markwise's own column honest about what isn't built", () => {
    const cells = MARKWISE.cells;
    assert.equal(cells.lmsSync.status, "no");
    assert.match(cells.lmsSync.note, /CSV export only/);
    assert.match(cells.lmsSync.note, /GradebookExporter/);
    assert.equal(cells.privacyCerts.status, "no");
    assert.match(cells.privacyCerts.note, /synthetic data only/);
    // Confidence is the model's own, uncalibrated guess.
    assert.equal(cells.confidence.status, "partial");
    // Free to run, but real AI needs the user's own keys.
    assert.equal(cells.freePlan.status, "partial");
    assert.match(cells.freePlan.note, /your own Anthropic and OpenAI keys/);
    // No license file yet, so "open" is only partly true.
    assert.equal(cells.openLocal.status, "partial");
    assert.match(cells.openLocal.note, /No open-source license/);
    // Quotes are asked for and checked, not guaranteed.
    assert.match(cells.evidence.note, /asked to quote/);
    assert.match(cells.evidence.note, /missing quote or one not in the paper is flagged/);
    // A returned grade adds XP, but never to the streak.
    assert.match(cells.studyStreaks.note, /Streaks count only the student's own study actions/);
    assert.match(cells.studyStreaks.note, /XP also adds a bonus when a grade is returned/);
    // The brief has no edit control: it is copied out to edit.
    assert.match(cells.conferenceBrief.note, /copy it as text to edit/);
    // Real AI needs keys; the demo engines are named as such.
    assert.match(cells.handwritten.note, /GPT-4o/);
    assert.match(cells.handwritten.note, /demo scanner reads only the sample photos/);
    assert.match(cells.injection.note, /heuristic/);
  });

  it("treats the hosted competitors alike on price and openness", () => {
    for (const product of COMPETITORS) {
      assert.equal(product.cells.freePlan.status, "yes", `${product.name} free plan`);
      assert.equal(product.cells.openLocal.status, "no", `${product.name} open source`);
      assert.equal(product.cells.openLocal.note, COMPETITORS[0].cells.openLocal.note, `${product.name} same wording`);
    }
  });

  it("applies one standard to unconfirmed claims", () => {
    const byKey = new Map(COMPETITORS.map((product) => [product.key, product]));
    // Quoting that isn't confirmed is Not stated, for every product alike.
    assert.equal(byKey.get("magicschool")?.cells.evidence.status, "unknown");
    assert.equal(byKey.get("essaygrader")?.cells.evidence.status, "unknown");
    // LMS sync that may need a paid plan is Partial, as Gradescope's is.
    assert.equal(byKey.get("essaygrader")?.cells.lmsSync.status, "partial");
    assert.equal(byKey.get("gradescope")?.cells.lmsSync.status, "partial");
    // Google's privacy note says only what the cited FERPA page says.
    assert.doesNotMatch(byKey.get("classroom")?.cells.privacyCerts.note ?? "", /Gemini|training/);
  });

  it("links only to each company's own pages", () => {
    const OWN: Record<string, readonly string[]> = {
      gradescope: ["https://www.gradescope.com/", "https://guides.gradescope.com/", "https://www.turnitin.com/"],
      cograder: ["https://cograder.com/", "https://intercom.help/cograder/"],
      brisk: ["https://www.briskteaching.com/", "https://help.briskteaching.com/"],
      magicschool: ["https://www.magicschool.ai/", "https://help.magicschool.ai/"],
      classroom: [
        "https://support.google.com/",
        "https://developers.google.com/",
        "https://cloud.google.com/",
        "https://workspaceupdates.googleblog.com/",
      ],
      essaygrader: ["https://www.essaygrader.ai/", "https://help.essaygrader.ai/"],
    };
    for (const product of COMPETITORS) {
      const own = OWN[product.key];
      assert.ok(own, `${product.key} has a list of its own hosts`);
      for (const { url } of sourcesFor(product)) {
        assert.ok(
          own.some((prefix) => url.startsWith(prefix)),
          `${product.name}: ${url}`,
        );
      }
    }
  });

  it("lists each product's source pages once, with the rows they back", () => {
    for (const product of COMPETITORS) {
      const sources = sourcesFor(product);
      assert.equal(new Set(sources.map((source) => source.url)).size, sources.length, product.name);
      const backed = sources.flatMap((source) => source.keys);
      const withSource = DIMENSION_KEYS.filter((key) => product.cells[key].sourceUrl);
      assert.deepEqual(sorted(backed), sorted(withSource), product.name);
      for (const source of sources) assert.ok(hostOf(source.url).length > 0);
    }
    assert.equal(topicsOf(["handwritten", "evidence"]), "Handwriting, quoted evidence");
    assert.equal(hostOf("https://www.gradescope.com/pricing"), "gradescope.com");
  });

  it("has no emoji and no hard-coded model ids", () => {
    const source = read("src/components/landing/comparison-data.ts");
    assert.doesNotMatch(source, /\p{Extended_Pictographic}/u);
    assert.doesNotMatch(source, /gpt-4o/);
  });
});

describe("judges comparison table", () => {
  const html = renderToStaticMarkup(createElement(ComparisonTable));
  const text = collapse(html.replace(/<[^>]+>/g, " "));

  it("is a real table with a caption and scoped headers", () => {
    assert.equal((html.match(/<table/g) ?? []).length, 1);
    assert.match(html, /<caption class="sr-only">Markwise and six grading tools, compared on 15 capabilities\./);
    assert.equal((html.match(/scope="col"/g) ?? []).length, PRODUCTS.length + 1, "a column header per product");
    assert.equal((html.match(/scope="row"/g) ?? []).length, DIMENSIONS.length, "a row header per dimension");
    assert.equal((html.match(/scope="rowgroup"/g) ?? []).length, DIMENSION_GROUPS.length);
  });

  /** Answer cells: every td except the column labels repeated in each group row. */
  const answerCells = [...html.matchAll(/<td(?![^>]*aria-hidden)[^>]*>([\s\S]*?)<\/td>/g)].map((match) => match[1]);

  it("renders a row for every dimension and a cell for every product", () => {
    for (const dimension of DIMENSIONS) assert.ok(text.includes(dimension.short), dimension.short);
    for (const product of PRODUCTS) assert.ok(text.includes(product.name), product.name);
    assert.equal(answerCells.length, DIMENSIONS.length * PRODUCTS.length);
  });

  it("repeats the column labels in every group row, hidden from screen readers", () => {
    const labels = [...html.matchAll(/<td aria-hidden="true"[^>]*>([^<]*)<\/td>/g)].map((match) => match[1]);
    assert.equal(labels.length, DIMENSION_GROUPS.length * PRODUCTS.length);
    assert.deepEqual(
      labels.slice(0, PRODUCTS.length),
      PRODUCTS.map((product) => product.shortName ?? product.name),
    );
  });

  it("keeps the Markwise column beside the Feature column on a phone, with the notes off", () => {
    const pinned = "max-sm:group-not-has-[#judges-notes:checked]/judges:sticky";
    const markwiseHeader = html.match(/<th scope="col" class="([^"]*)">Markwise/);
    assert.ok(markwiseHeader?.[1].includes(pinned), "the Markwise header is pinned");
    // One pinned cell per row: the header, each group row, each dimension row.
    const count = html.split(pinned).length - 1;
    assert.equal(count, 1 + DIMENSION_GROUPS.length + DIMENSIONS.length);
  });

  it("pairs every answer with an icon and a word, never color alone", () => {
    const cells = answerCells;
    assert.equal(cells.length, DIMENSIONS.length * PRODUCTS.length);
    const words = Object.values(STATUS_LABELS);
    for (const cell of cells) {
      assert.match(cell, /<svg[^>]*aria-hidden="true"/, "an icon");
      const visible = collapse(cell.replace(/<[^>]+>/g, " ")).trim();
      assert.ok(
        words.some((word) => visible.startsWith(word)),
        `a status word: ${visible.slice(0, 40)}`,
      );
    }
  });

  it("keeps every note in the markup, behind a switch that works without JavaScript", () => {
    assert.match(html, /<input id="judges-notes" type="checkbox" role="switch"/);
    assert.match(text, /Show the note behind each answer/);
    for (const product of PRODUCTS) {
      for (const key of DIMENSION_KEYS) {
        const note = product.cells[key].note.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
        assert.ok(html.includes(note), `${product.name} ${key} note`);
      }
    }
  });

  it("links each note to the page it rests on, with the notes on", () => {
    for (const product of PRODUCTS) {
      for (const dimension of DIMENSIONS) {
        if (!product.cells[dimension.key].sourceUrl) continue;
        const name = `Source for ${product.name}: ${dimension.short}`.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");
        assert.ok(collapse(html.replace(/<[^>]+>/g, "")).includes(name), name);
      }
    }
  });

  it("says what Not stated means, and what the answers rest on", () => {
    assert.ok(text.includes("Not stated means we found nothing either way, which is not the same as No."));
    assert.ok(text.includes(`web search results as of ${CHECKED_ON}`));
    assert.ok(text.includes("We didn't test these products.") || text.includes("We didn&#x27;t test these products."));
    // Every legend term is set apart from its muted definition.
    const legend = html.slice(html.indexOf("<dl"), html.indexOf("</dl>"));
    assert.equal((legend.match(/<dt><span[^>]*><svg[\s\S]*?<span class="font-medium text-foreground">/g) ?? []).length, STATUSES.length);
  });
});

describe("judges section", () => {
  const judges = read("src/components/landing/judges.tsx");
  const flat = collapse(judges);

  it("is a labelled section at #judges, linked from the header", () => {
    assert.match(judges, /<section id="judges" aria-labelledby="judges-heading"/);
    assert.ok(flat.includes("For judges: how Markwise is different"));
    assert.match(read("src/components/landing/site-header.tsx"), /\{ href: "#judges", label: "For judges" \}/);
  });

  it("sits after the trust section and before the FAQ", () => {
    const page = read("src/app/page.tsx");
    const gate = page.indexOf("<ApprovalGate");
    const section = page.indexOf("<Judges demoLogin={demoLogin} />");
    const faq = page.indexOf("<Faq");
    assert.ok(gate > 0 && section > gate && faq > section);
  });

  it("reuses the demo sign-in buttons and links the README demo script", () => {
    assert.match(judges, /<DemoCtas demoLogin=\{demoLogin\}/);
    assert.match(judges, /href=\{DEMO_SCRIPT_URL\}/);
    assert.ok(flat.includes("Judge it in 3 minutes"));
  });

  it("walks judges through the app's own controls, and drops the steps when demo sign-in is off", () => {
    assert.ok(flat.includes("In the account menu, choose <Ui>Demo: view as a student → Ava Quillon</Ui>"));
    assert.ok(flat.includes("<Ui>Plan it</Ui>"));
    assert.match(flat, /\{demoLogin \? \(.*<ol.*\) : \(.*One-click demo sign-in is turned off for this deployment\..*\)\}/);
  });

  it("puts the comparison right after the differences, before the walkthrough", () => {
    const table = judges.indexOf("<ComparisonTable");
    const behind = judges.indexOf("Where Markwise is behind");
    const walkthrough = judges.indexOf("Judge it in 3 minutes");
    const sources = judges.indexOf("<Sources />");
    assert.ok(table > judges.indexOf("What Markwise puts together"));
    assert.ok(table < behind && behind < walkthrough && walkthrough < sources);
  });

  it("is reachable from the top of the page at every width", () => {
    assert.match(read("src/components/landing/hero.tsx"), /href="#judges"/);
  });

  it("opens every outside link in a new tab, safely, and says so", () => {
    assert.doesNotMatch(judges, /<a\b/, "outside links go through ExternalAnchor");
    const anchor = read("src/components/landing/external-anchor.tsx");
    const tags = [...anchor.matchAll(/<a\b[^>]*>/g)].map((match) => match[0]);
    assert.equal(tags.length, 1);
    assert.match(tags[0], /target="_blank"/);
    assert.match(tags[0], /rel="noopener noreferrer"/);
    assert.ok(anchor.includes('<span className="sr-only"> (opens in a new tab)</span>'));
  });

  it("keeps reading text at 14px or more", () => {
    assert.doesNotMatch(judges, /text-\[0\.8125rem\]|text-\[0\.75rem\]/);
    assert.doesNotMatch(read("src/components/landing/comparison-table.tsx"), /text-\[0\.75rem\]/);
  });

  it("states where the answers come from, and the trademark note", () => {
    assert.ok(
      flat.includes(
        "Compiled from public pages and web search results as of {CHECKED_ON}. Products change quickly; follow the links to confirm.",
      ),
    );
    assert.ok(flat.includes("Product names are trademarks of their owners."));
    assert.ok(flat.includes("not affiliated with or endorsed by any of these companies"));
  });

  it("says plainly where Markwise is behind", () => {
    assert.ok(flat.includes("Where Markwise is behind"));
    for (const item of [
      "No LMS sync yet",
      "No privacy review or certifications",
      "Demo sign-in, not real accounts",
      "uncalibrated",
      "Scale is untested",
    ]) {
      assert.ok(flat.includes(item), item);
    }
  });

  it("shows no competitor logos or images", () => {
    for (const path of [
      "src/components/landing/judges.tsx",
      "src/components/landing/comparison-table.tsx",
      "src/components/landing/external-anchor.tsx",
    ]) {
      const source = read(path);
      assert.doesNotMatch(source, /<img|<Image|<picture|logo/i, path);
    }
  });
});
