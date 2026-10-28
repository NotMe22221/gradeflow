import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { STUDENT_NAV, TEACHER_NAV } from "@/components/app-shell/nav-items";
import { activeClassId, activeNavId, badgeText } from "@/components/app-shell/nav-model";

describe("navigation destinations", () => {
  it("give phones 3-5 labelled destinations per role", () => {
    for (const nav of [TEACHER_NAV, STUDENT_NAV]) {
      const bottom = nav.filter((item) => item.bottom);
      assert.ok(bottom.length >= 3 && bottom.length <= 5, `${bottom.length} bottom destinations`);
      for (const item of bottom) assert.ok(item.label.length > 0 && item.label.length <= 12, item.label);
    }
    assert.deepEqual(
      TEACHER_NAV.filter((item) => item.bottom).map((item) => item.label),
      ["Home", "Classes", "To review", "Gradebook"]
    );
    assert.deepEqual(
      STUDENT_NAV.filter((item) => item.bottom).map((item) => item.label),
      ["Home", "To-do", "Classes", "Goals"]
    );
  });

  it("use unique ids and short rail labels", () => {
    for (const nav of [TEACHER_NAV, STUDENT_NAV]) {
      assert.equal(new Set(nav.map((item) => item.id)).size, nav.length);
      for (const item of nav) assert.ok((item.shortLabel ?? item.label).length <= 10, item.label);
    }
  });
});

describe("active destination", () => {
  it("marks exactly one teacher destination, by the longest match", () => {
    assert.equal(activeNavId(TEACHER_NAV, "/dashboard"), "home");
    assert.equal(activeNavId(TEACHER_NAV, "/classes"), "classes");
    assert.equal(activeNavId(TEACHER_NAV, "/classes/abc/grades"), "classes");
    assert.equal(activeNavId(TEACHER_NAV, "/assignments/xyz"), "classes");
    assert.equal(activeNavId(TEACHER_NAV, "/review"), "review");
    assert.equal(activeNavId(TEACHER_NAV, "/scan"), "scan");
    assert.equal(activeNavId(TEACHER_NAV, "/settings"), null);
  });

  it("keeps student Home to its own page and lets Goals win on #goal-planner", () => {
    assert.equal(activeNavId(STUDENT_NAV, "/student"), "home");
    assert.equal(activeNavId(STUDENT_NAV, "/student", "#goal-planner"), "goals");
    assert.equal(activeNavId(STUDENT_NAV, "/student", "#other"), "home");
    assert.equal(activeNavId(STUDENT_NAV, "/student/todo"), "todo");
    assert.equal(activeNavId(STUDENT_NAV, "/student/classes"), "classes");
    assert.equal(activeNavId(STUDENT_NAV, "/student/classes/c1/classwork"), "classes");
    assert.equal(activeNavId(STUDENT_NAV, "/student/assignments/a1"), "classes");
    // Goals on another page is just a link back to Home's planner.
    assert.equal(activeNavId(STUDENT_NAV, "/student/todo", "#goal-planner"), "todo");
  });

  it("finds the open class among the listed ones", () => {
    assert.equal(activeClassId(["c1", "c2"], "/classes/", "/classes/c2/people"), "c2");
    assert.equal(activeClassId(["c1", "c2"], "/classes/", "/classes"), null);
    assert.equal(activeClassId(["c1"], "/classes/", "/classes/other"), null);
    assert.equal(activeClassId(["c1"], "/student/classes/", "/student/classes/c1"), "c1");
  });

  it("caps badge text", () => {
    assert.equal(badgeText(7), "7");
    assert.equal(badgeText(99), "99");
    assert.equal(badgeText(140), "99+");
  });
});

// --- App shell sources -------------------------------------------------------------

const ROOT = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

describe("account menu: the demo student list", () => {
  const source = read("src/components/app-shell/user-menu.tsx");
  const match = source.match(
    /\[max-height:min\(([\d.]+)rem,round\(down,(\d+)dvh_-_([\d.]+)rem,([\d.]+)rem\)_\+_([\d.]+)rem\)\]/
  );
  /** A menu row (DropdownMenuItem, min-h-10), in rem. */
  const ROW = 2.5;

  /** How many rows of the list show at a given window height (default 16px rem). */
  function visibleRows(height: number): number {
    assert.ok(match);
    const [cap, vh, minus, step, plus] = match.slice(1).map(Number);
    const rem = 16;
    const snapped = Math.floor(((vh / 100) * height - minus * rem) / (step * rem)) * step * rem + plus * rem;
    return Math.min(cap * rem, snapped) / (ROW * rem);
  }

  it("snaps to whole rows", () => {
    assert.ok(match, "the student list keeps its row-snapped max-height");
    assert.match(read("src/components/ui/dropdown-menu.tsx"), /data-slot="dropdown-menu-item"[\s\S]*?min-h-10/);
    assert.equal(Number(match[4]), ROW);
  });

  it("always cuts the last row in half, so it shows the list scrolls where scrollbars are hidden", () => {
    for (const height of [600, 667, 720, 768, 800, 844, 900, 1080, 1440]) {
      assert.equal(visibleRows(height) % 1, 0.5, `${height}px tall: ${visibleRows(height)} rows`);
    }
  });

  it("shows the first eight students in full on a 900px-tall window (Rafael is eighth of the ten demo students)", () => {
    assert.ok(visibleRows(900) >= 8.5, `${visibleRows(900)} rows`);
  });

  it("leaves room for the rest of the menu, so Sign out stays in view", () => {
    // Everything but the list (the account, Customize, Theme and Sign out) measures 23.5rem.
    const outer = source.match(/\[max-height:min\(var\(--radix-dropdown-menu-content-available-height\),([\d.]+)rem\)\]/);
    assert.ok(outer, "the menu keeps its own max-height");
    assert.ok(Number(outer[1]) >= 23.5 + Number(match?.[1]), `menu cap ${outer[1]}rem`);
  });
});

describe("floating panels", () => {
  it("keep the 16px page gutter when shifted to fit a phone screen", () => {
    assert.match(read("src/components/ui/popover.tsx"), /collisionPadding = 16,[\s\S]*collisionPadding=\{collisionPadding\}/);
  });
});

describe("the app-wide error page", () => {
  const source = read("src/app/global-error.tsx");

  it("brings its own document and styles, since it replaces the root layout", () => {
    assert.match(source, /^"use client";/);
    assert.match(source, /<html lang="en"/);
    assert.match(source, /<body>/);
    assert.match(source, /import "\.\/globals\.css";/);
    assert.match(source, /retry\(\)/);
  });

  it("never shows the error itself", () => {
    assert.doesNotMatch(source, /error\.(message|stack|digest)|\{error\}|console\./);
  });
});
