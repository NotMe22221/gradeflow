import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { calmStreak } from "@/components/student/streak-text";
import {
  absoluteDue,
  dueWhen,
  dueWhenText,
  toTodoItem,
  workStatus,
  type StudentWorkRow,
} from "@/components/student/todo-model";
import { WorkStatusChip } from "@/components/student/work-status-chip";

// The student pages: due dates said two ways, calm streak words, status as an
// icon and a word, and guards on the student files (tokens only, rem text, no
// AI glyphs, density-aware rows).

const UTC = "UTC";
const LA = "America/Los_Angeles";
const AUCKLAND = "Pacific/Auckland";

/** Monday, October 26, 2026, 3pm UTC. */
const NOW = new Date(Date.UTC(2026, 9, 26, 15));

/** A due date `offset` days from Oct 26, stored at noon UTC like the assignment builder does. */
function due(offset: number): string {
  return new Date(Date.UTC(2026, 9, 26 + offset, 12)).toISOString();
}

function row(partial: Partial<StudentWorkRow> = {}): StudentWorkRow {
  return {
    id: "a1",
    title: "Final Portfolio Reflection",
    classId: "c1",
    className: "English 10",
    kind: "ESSAY",
    dueDate: null,
    submittedAt: null,
    publishedAt: null,
    pastDue: false,
    awaitingScan: false,
    state: "not_submitted",
    score: null,
    totalPoints: 30,
    criteria: [],
    postedAt: due(-5),
    returnedAt: null,
    ...partial,
  };
}

describe("dueWhen: relative and absolute due dates", () => {
  it("says how far away the due day is, then the calendar day", () => {
    const cases: [number, string, string][] = [
      [0, "Due today", "Mon, Oct 26"],
      [1, "Due tomorrow", "Tue, Oct 27"],
      [3, "Due Thursday", "Thu, Oct 29"],
      [6, "Due Sunday", "Sun, Nov 1"],
      [7, "Due in 7 days", "Mon, Nov 2"],
      [14, "Due in 14 days", "Mon, Nov 9"],
      [-1, "Due yesterday", "Sun, Oct 25"],
      [-6, "Due 6 days ago", "Tue, Oct 20"],
    ];
    for (const [offset, relative, absolute] of cases) {
      assert.deepEqual(dueWhen({ dueDate: due(offset), kind: "ESSAY" }, NOW, UTC), { relative, absolute }, `offset ${offset}`);
    }
  });

  it("words a paper test by its test day", () => {
    assert.equal(dueWhen({ dueDate: due(0), kind: "TEST" }, NOW, UTC).relative, "Test today");
    assert.equal(dueWhen({ dueDate: due(1), kind: "TEST" }, NOW, UTC).relative, "Test tomorrow");
    assert.equal(dueWhen({ dueDate: due(4), kind: "TEST" }, NOW, UTC).relative, "Test on Friday");
    assert.equal(dueWhen({ dueDate: due(9), kind: "TEST" }, NOW, UTC).relative, "Test in 9 days");
    assert.equal(dueWhen({ dueDate: due(-1), kind: "TEST" }, NOW, UTC).relative, "Test was yesterday");
    assert.equal(dueWhen({ dueDate: due(-3), kind: "TEST" }, NOW, UTC).relative, "Test was 3 days ago");
  });

  it("has no absolute date without a due date", () => {
    assert.deepEqual(dueWhen({ dueDate: null, kind: "ESSAY" }, NOW, UTC), { relative: "No due date", absolute: null });
    assert.deepEqual(dueWhen({ dueDate: null, kind: "TEST" }, NOW, UTC), { relative: "No test date", absolute: null });
    assert.equal(dueWhenText({ relative: "No due date", absolute: null }), "No due date");
    assert.equal(dueWhenText({ relative: "Due tomorrow", absolute: "Tue, Oct 27" }), "Due tomorrow · Tue, Oct 27");
  });

  it("counts from the viewer's today, but the calendar day reads the same in every zone", () => {
    // 3pm UTC Monday is still Monday morning in LA, but already Tuesday in Auckland.
    assert.deepEqual(dueWhen({ dueDate: due(1), kind: "ESSAY" }, NOW, LA), { relative: "Due tomorrow", absolute: "Tue, Oct 27" });
    assert.deepEqual(dueWhen({ dueDate: due(1), kind: "ESSAY" }, NOW, AUCKLAND), { relative: "Due today", absolute: "Tue, Oct 27" });
    assert.equal(absoluteDue(due(1)), "Tue, Oct 27");
  });

  it("adds the year only when it isn't the viewer's current year", () => {
    assert.equal(dueWhen({ dueDate: new Date(Date.UTC(2027, 0, 8, 12)).toISOString(), kind: "ESSAY" }, NOW, UTC).absolute, "Fri, Jan 8, 2027");
    // New Year's Eve in LA is already Jan 1 in UTC: the year still comes from the viewer's calendar.
    const nye = new Date(Date.UTC(2027, 0, 1, 6));
    assert.equal(dueWhen({ dueDate: new Date(Date.UTC(2027, 0, 1, 12)).toISOString(), kind: "ESSAY" }, nye, LA).absolute, "Fri, Jan 1, 2027");
    assert.equal(dueWhen({ dueDate: new Date(Date.UTC(2026, 11, 31, 12)).toISOString(), kind: "ESSAY" }, nye, LA).absolute, "Thu, Dec 31");
    assert.equal(absoluteDue("not a date"), null);
  });

  it("is part of every To-do item", () => {
    const item = toTodoItem(row({ dueDate: due(3) }), NOW, UTC);
    assert.deepEqual(item.due, { relative: "Due Thursday", absolute: "Thu, Oct 29" });
    assert.equal(item.dueText, "Due Thursday");
  });
});

describe("calm streak words", () => {
  it("never alarms: a lost streak reads Streak ended, with the best run", () => {
    assert.deepEqual(calmStreak({ current: 4, activeToday: true, longest: 6 }), {
      headline: "4-day streak",
      detail: "Studied today",
    });
    assert.deepEqual(calmStreak({ current: 4, activeToday: false, longest: 6 }), {
      headline: "4-day streak",
      detail: "Study today to keep it going",
    });
    assert.deepEqual(calmStreak({ current: 0, activeToday: false, longest: 6 }), {
      headline: "Streak ended",
      detail: "Best so far: 6 days. Start a new one today.",
    });
    assert.equal(calmStreak({ current: 0, activeToday: false, longest: 0 }).headline, "No streak yet");
  });
});

describe("status chips", () => {
  const html = (status: ReturnType<typeof workStatus>) => renderToStaticMarkup(createElement(WorkStatusChip, { status }));

  it("pair every status with an icon and a word", () => {
    const statuses = [
      workStatus({ state: "not_submitted", kind: "ESSAY", pastDue: false, awaitingScan: false }),
      workStatus({ state: "not_submitted", kind: "ESSAY", pastDue: true, awaitingScan: false }),
      workStatus({ state: "submitted", kind: "ESSAY", pastDue: false, awaitingScan: false }),
      workStatus({ state: "returned", kind: "ESSAY", pastDue: false, awaitingScan: false }),
      workStatus({ state: "graded", kind: "ESSAY", pastDue: false, awaitingScan: false }),
      workStatus({ state: "not_submitted", kind: "TEST", pastDue: false, awaitingScan: true }),
      workStatus({ state: "not_submitted", kind: "TEST", pastDue: false, awaitingScan: false }),
    ];
    assert.deepEqual(
      statuses.map((status) => status.label),
      ["Assigned", "Missing", "Turned in", "Sent back", "Returned", "Waiting for scan", "Paper test"]
    );
    for (const status of statuses) {
      const markup = html(status);
      assert.match(markup, /<svg[^>]*aria-hidden="true"/, `${status.label} has an icon`);
      assert.ok(markup.includes(`>${status.label}</span>`), `${status.label} has its word`);
    }
  });

  it("tint only what needs the student or answers them", () => {
    assert.match(html({ label: "Missing", tone: "missing" }), /bg-danger-soft/);
    assert.match(html({ label: "Sent back", tone: "attention" }), /bg-warning-soft/);
    assert.match(html({ label: "Returned", tone: "returned" }), /bg-success-soft/);
    for (const tone of ["assigned", "done", "neutral"] as const) {
      assert.doesNotMatch(html({ label: "x", tone }), /bg-/, `${tone} stays quiet`);
    }
  });
});

// --- Source guards ----------------------------------------------------------------

const ROOT = join(import.meta.dirname, "..");

function files(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(join(ROOT, path)).isDirectory()) return files(path);
    return /\.(tsx|ts)$/.test(name) ? [path] : [];
  });
}

// The student pages and their components (Home's composition and class cards
// belong to the layout owner and are checked by their own tests).
const OWNED = [
  ...files("src/components/student").filter((path) => !/home-view\.tsx$|class-card\.tsx$/.test(path)),
  ...files("src/app/(student)/student").filter(
    (path) => !/student[\\/](page|loading)\.tsx$/.test(path) && !/classes[\\/]\(list\)/.test(path)
  ),
];

describe("student page sources", () => {
  it("covers the files", () => {
    assert.ok(OWNED.some((path) => path.endsWith("todo-view.tsx")));
    assert.ok(OWNED.some((path) => path.endsWith("assignment-inbox.tsx")));
    assert.ok(!OWNED.some((path) => path.endsWith("home-view.tsx")));
  });

  for (const path of OWNED) {
    const source = readFileSync(join(ROOT, path), "utf8");

    it(`${path}: theme tokens only, rem text, no AI glyphs`, () => {
      // White text is allowed only on class-color fills (icon circles, banners).
      assert.doesNotMatch(source, /\b(bg|border|ring|fill|stroke)-(black|white)\b|\btext-black\b/, "black or white surfaces");
      assert.doesNotMatch(source, /\b(bg|text|border|ring)-(gray|slate|zinc|neutral|stone|indigo|purple|violet)-\d/, "palette colors");
      assert.doesNotMatch(source, /["'\s(:]#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/, "a hex color");
      assert.doesNotMatch(source, /text-\[\d+(\.\d+)?px\]/, "a px text size");
      assert.doesNotMatch(source, /\b(Sparkles?|WandSparkles|Wand2?|Bot|BrainCircuit|Brain|AutoAwesome|SmartToy)\b/, "an AI glyph");
      assert.doesNotMatch(source, /bg-(linear|radial|conic|gradient)-/, "a gradient");
    });
  }

  it("list rows follow the density setting", () => {
    for (const path of [
      "src/components/student/todo-view.tsx",
      "src/components/student/assignment-inbox.tsx",
      "src/components/student/class-classwork.tsx",
    ]) {
      assert.match(readFileSync(join(ROOT, path), "utf8"), /\bpy-row\b/, path);
    }
  });

  it("keeps the key action names", () => {
    const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
    assert.match(read("src/components/student/turn-in-form.tsx"), /Add or create[\s\S]*Paste text[\s\S]*"Turn in"/);
    assert.match(read("src/components/student/turn-in-form.tsx"), /Your paper/);
    assert.match(read("src/components/student/goal-planner.tsx"), /"Plan it"/);
    assert.match(read("src/components/student/goal-engine-badge.tsx"), /Demo planner/);
    assert.match(read("src/components/student/inbox-panel.tsx"), /Log a study session/);
    assert.match(read("src/components/student/your-work.tsx"), /Your grade/);
  });
});
