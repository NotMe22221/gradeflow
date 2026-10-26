import assert from "node:assert/strict";
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
