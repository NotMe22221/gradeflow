import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  arrayMove,
  availableMoves,
  clamp,
  columnOf,
  describeOrderPosition,
  describePosition,
  hideSection,
  keepInMain,
  MAIN_ONLY_SECTIONS,
  mergeOrder,
  mergeVisible,
  moveBy,
  moveInOrder,
  moveToColumn,
  orderItems,
  positionOf,
  sameLayout,
  showSection,
  visibleIn,
} from "@/components/layout-editor/model";
import {
  defaultSectionLayout,
  LAYOUT_SURFACES,
  normalizeSectionLayout,
  orderByIds,
  SURFACE_SECTIONS,
  type SectionLayout,
} from "@/lib/preferences/schema";

const layout = (main: string[], side: string[] = [], hidden: string[] = []): SectionLayout => ({ main, side, hidden });

describe("layout editor: basics", () => {
  it("clamps and moves array items without mutating the input", () => {
    assert.equal(clamp(5, 0, 3), 3);
    assert.equal(clamp(-1, 0, 3), 0);
    assert.equal(clamp(2, 0, -1), 0);
    const items = ["a", "b", "c"];
    assert.deepEqual(arrayMove(items, 0, 2), ["b", "c", "a"]);
    assert.deepEqual(arrayMove(items, 2, -5), ["c", "a", "b"]);
    assert.deepEqual(arrayMove(items, 7, 0), ["a", "b", "c"]);
    assert.deepEqual(items, ["a", "b", "c"]);
  });

  it("finds a section's column and position among visible sections", () => {
    const l = layout(["stats", "tools", "classes"], ["recent", "missed"], ["tools"]);
    assert.equal(columnOf(l, "recent"), "side");
    assert.equal(columnOf(l, "nope"), null);
    assert.deepEqual(visibleIn(l, "main"), ["stats", "classes"]);
    assert.deepEqual(positionOf(l, "classes"), { column: "main", position: 2, count: 2 });
    assert.equal(positionOf(l, "tools"), null);
    assert.equal(describePosition({ column: "side", position: 1, count: 2 }), "position 1 of 2 in the side column");
  });

  it("refills visible slots and keeps hidden sections where they were", () => {
    assert.deepEqual(mergeVisible(["a", "h", "b"], new Set(["h"]), ["b", "a"]), ["b", "h", "a"]);
    // One more visible id than slots (it arrived from the other column): it goes last.
    assert.deepEqual(mergeVisible(["a", "h"], new Set(["h"]), ["x", "a"]), ["x", "h", "a"]);
    // One fewer (it left): the last free slot is dropped.
    assert.deepEqual(mergeVisible(["a", "h", "b"], new Set(["h"]), ["b"]), ["b", "h"]);
  });
});

describe("layout editor: moving sections", () => {
  it("moves up and down among visible sections, skipping hidden ones, and clamps at the ends", () => {
    const l = layout(["stats", "tools", "classes"], ["recent", "missed"], ["tools"]);
    const up = moveBy(l, "classes", -1);
    assert.deepEqual(up.main, ["classes", "tools", "stats"]);
    assert.deepEqual(visibleIn(up, "main"), ["classes", "stats"]);
    assert.deepEqual(up.hidden, ["tools"]);
    assert.equal(moveBy(l, "stats", -1), l, "already first");
    assert.equal(moveBy(l, "classes", 5).main.at(-1), "classes");
    assert.equal(moveBy(l, "tools", 1), l, "a hidden section doesn't move");
  });

  it("moves a section to the other column, at the end by default or at an index", () => {
    const l = defaultSectionLayout("teacherHome");
    const toSide = moveToColumn(l, "stats", "side");
    assert.deepEqual(toSide.main, ["tools", "classes"]);
    assert.deepEqual(toSide.side, ["recent", "missed", "stats"]);
    const atTop = moveToColumn(l, "stats", "side", 0);
    assert.deepEqual(atTop.side, ["stats", "recent", "missed"]);
    const back = moveToColumn(atTop, "stats", "main", 1);
    assert.deepEqual(back.main, ["tools", "stats", "classes"]);
    assert.deepEqual(back.side, ["recent", "missed"]);
  });

  it("reorders within a column when the target is its own column", () => {
    const l = defaultSectionLayout("teacherHome");
    assert.deepEqual(moveToColumn(l, "classes", "main", 0).main, ["classes", "stats", "tools"]);
  });

  it("never places a section twice, with hidden sections in both columns", () => {
    const l = layout(["stats", "tools", "classes"], ["recent", "missed"], ["tools", "missed"]);
    const next = moveToColumn(l, "stats", "side", 0);
    const all = [...next.main, ...next.side];
    assert.equal(new Set(all).size, all.length);
    assert.deepEqual(all.sort(), ["classes", "missed", "recent", "stats", "tools"]);
    assert.deepEqual(visibleIn(next, "side"), ["stats", "recent"]);
    // The result is still a valid layout as the schema reads it.
    assert.deepEqual(normalizeSectionLayout("teacherHome", next), next);
  });

  it("treats sections the page can't render as hidden for positions and moves", () => {
    const l = layout(["progress", "classes", "inbox", "planner"]);
    const available = new Set(["progress", "classes"]);
    assert.deepEqual(positionOf(l, "classes", available), { column: "main", position: 2, count: 2 });
    const next = moveBy(l, "classes", -1, available);
    assert.deepEqual(next.main, ["classes", "progress", "inbox", "planner"]);
  });

  it("hides and shows sections, but never an essential one", () => {
    const essential = new Set(["classes"]);
    const l = defaultSectionLayout("teacherHome");
    const hidden = hideSection(l, "missed", essential);
    assert.deepEqual(hidden.hidden, ["missed"]);
    assert.deepEqual(hidden.side, ["recent", "missed"], "a hidden section keeps its slot");
    assert.equal(hideSection(l, "classes", essential), l);
    assert.equal(hideSection(hidden, "missed", essential), hidden);
    assert.deepEqual(showSection(hidden, "missed"), l);
  });

  it("keeps wide sections out of the side column", () => {
    const l = layout(["progress"], ["inbox", "classes"]);
    assert.deepEqual(keepInMain(l, new Set(["inbox", "planner"])), layout(["progress", "inbox"], ["classes"]));
    const fine = layout(["inbox"], ["classes"]);
    assert.equal(keepInMain(fine, new Set(["inbox"])), fine);
  });

  it("lists only known main-column sections as main-only, so defaults already respect it", () => {
    for (const surface of LAYOUT_SURFACES) {
      const known = SURFACE_SECTIONS[surface] as Record<string, { column: string }>;
      for (const id of MAIN_ONLY_SECTIONS[surface]) {
        assert.ok(id in known, `${surface}.${id} is a section`);
        assert.equal(known[id]?.column, "main");
      }
      const defaults = defaultSectionLayout(surface);
      assert.equal(keepInMain(defaults, new Set(MAIN_ONLY_SECTIONS[surface])), defaults);
    }
  });

  it("compares layouts, ignoring the order of the hidden set", () => {
    assert.ok(sameLayout(layout(["a"], ["b"], ["x", "y"]), layout(["a"], ["b"], ["y", "x"])));
    assert.ok(!sameLayout(layout(["a", "b"]), layout(["b", "a"])));
    assert.ok(!sameLayout(layout(["a"], ["b"]), layout(["a", "b"])));
  });
});

describe("layout editor: class card order", () => {
  it("orders items like the schema's orderByIds", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    for (const order of [[], ["c"], ["d", "a"], ["x", "b", "d"], ["d", "c", "b", "a"]]) {
      assert.deepEqual(orderItems(items, order), orderByIds(items, order));
    }
    assert.deepEqual(orderItems(items, ["c", "a"]).map((item) => item.id), ["c", "a", "b", "d"]);
  });

  it("moves a class to the start, earlier, later, or to the end", () => {
    const ids = ["a", "b", "c", "d"];
    assert.deepEqual(moveInOrder(ids, "c", "start"), ["c", "a", "b", "d"]);
    assert.deepEqual(moveInOrder(ids, "c", "earlier"), ["a", "c", "b", "d"]);
    assert.deepEqual(moveInOrder(ids, "b", "later"), ["a", "c", "b", "d"]);
    assert.deepEqual(moveInOrder(ids, "a", "end"), ["b", "c", "d", "a"]);
    assert.deepEqual(moveInOrder(ids, "a", "earlier"), ids);
    assert.deepEqual(moveInOrder(ids, "zzz", "start"), ids);
  });

  it("offers only the moves that do something", () => {
    assert.deepEqual(availableMoves(0, 3), { start: false, earlier: false, later: true, end: true });
    assert.deepEqual(availableMoves(2, 3), { start: true, earlier: true, later: false, end: false });
    assert.deepEqual(availableMoves(0, 1), { start: false, earlier: false, later: false, end: false });
    assert.equal(describeOrderPosition(1, 5), "position 2 of 5");
  });

  it("saves the arranged order first and keeps unseen ids after it, without duplicates", () => {
    assert.deepEqual(mergeOrder(["b", "a"], ["a", "z", "b"]), ["b", "a", "z"]);
    assert.equal(mergeOrder(Array.from({ length: 300 }, (_, i) => `c${i}`), []).length, 200);
  });
});
