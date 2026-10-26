import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SearchButton } from "@/components/command-palette/search-button";
import { InboxPanel } from "@/components/student/inbox-panel";
import type { InboxRow } from "@/components/student/inbox-model";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("search field", () => {
  it("hints Ctrl K (the server render, before the platform is known) and announces no single-key shortcut", () => {
    const html = renderToStaticMarkup(createElement(SearchButton, { role: "TEACHER", open: false, onOpen: () => {} }));
    assert.match(html, /aria-keyshortcuts="Control\+K Meta\+K"/);
    assert.match(html, /<kbd[^>]*>Ctrl K<\/kbd>/);
    assert.doesNotMatch(html, /<kbd[^>]*>\/<\/kbd>/);
    assert.match(html, /aria-label="Search classes, assignments, students"/);
  });
});

describe("inbox quick actions", () => {
  const row: InboxRow = {
    id: "a1",
    title: "Lab Report: Willow Creek Water",
    classId: "c1",
    className: "Environmental Science",
    kind: "ESSAY",
    dueDate: null,
    submittedAt: null,
    publishedAt: null,
    pastDue: false,
    awaitingScan: false,
    state: "not_submitted",
    score: null,
    totalPoints: 20,
    criteria: [],
    dueText: "No due date",
  };
  const base = { row, onLogStudy: () => {}, studyPending: false, studyLoggedToday: false };

  it("offer Plan my grade only when a planner can take it", () => {
    const withPlanner = renderToStaticMarkup(createElement(InboxPanel, { ...base, onPlan: () => {} }));
    assert.match(withPlanner, /Plan my grade/);
    const without = renderToStaticMarkup(createElement(InboxPanel, base));
    assert.doesNotMatch(without, /Plan my grade/);
    // Log a study session takes the freed column.
    assert.match(without, /@min-\[25rem\]:col-span-2[^"]*"[^>]*>(?:(?!<\/button>).)*Log a study session/s);
  });
});

describe("source guards", () => {
  it("rebuilds the assignment builder when ?kind changes (search's Create handwritten test on the builder)", () => {
    assert.match(read("src/app/(teacher)/classes/[classId]/assignments/new/page.tsx"), /<RubricBuilder\s+key=\{initialKind\}/);
  });

  it("names the student Home button Arrange, never Customize", () => {
    const home = read("src/components/student/home-view.tsx");
    assert.match(home, /<ArrangeButton\b/);
    assert.doesNotMatch(home, /<CustomizeButton\b/);
  });

  it("ties Plan my grade to the planner section being shown", () => {
    assert.match(read("src/components/student/home-view.tsx"), /<PlannerBridgeProvider section="planner">/);
    assert.match(read("src/components/student/assignment-inbox.tsx"), /onPlan: canPlan \? planFor : undefined/);
  });
});
