import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_PREFERENCES,
  defaultSectionLayout,
  mergePreferences,
  normalizePreferences,
  normalizeSectionLayout,
  orderByIds,
  preferencesPatchSchema,
} from "@/lib/preferences/schema";

describe("preferences", () => {
  it("falls back to defaults for missing or junk values", () => {
    assert.deepEqual(normalizePreferences(undefined), DEFAULT_PREFERENCES);
    assert.deepEqual(normalizePreferences({ theme: "neon", accent: 3, textSize: "huge" }), DEFAULT_PREFERENCES);
  });

  it("places every known section exactly once and drops unknown ids", () => {
    const layout = normalizeSectionLayout("teacherHome", {
      main: ["missed", "bogus", "missed"],
      side: ["stats"],
      hidden: ["tools", "nope"],
    });
    assert.deepEqual(layout.main, ["missed", "tools", "classes"]);
    assert.deepEqual(layout.side, ["stats", "recent"]);
    assert.deepEqual(layout.hidden, ["tools"]);
  });

  it("never hides an essential section", () => {
    assert.deepEqual(normalizeSectionLayout("studentHome", { hidden: ["inbox", "planner"] }).hidden, ["planner"]);
    assert.deepEqual(normalizeSectionLayout("teacherHome", { hidden: ["classes"] }).hidden, []);
  });

  it("puts sections a saved layout doesn't know back in their default column", () => {
    const layout = normalizeSectionLayout("teacherHome", { main: ["classes"], side: [] });
    assert.deepEqual(layout.main, ["classes", "stats", "tools"]);
    assert.deepEqual(layout.side, ["recent", "missed"]);
  });

  it("merges a patch without losing other settings", () => {
    const dark = mergePreferences(DEFAULT_PREFERENCES, { theme: "dark" });
    const moved = mergePreferences(dark, { layout: { classOrder: ["b", "a", "b"] } });
    assert.equal(moved.theme, "dark");
    assert.deepEqual(moved.layout.classOrder, ["b", "a"]);
    assert.deepEqual(moved.layout.teacherHome, defaultSectionLayout("teacherHome"));
  });

  it("accepts only known patch fields", () => {
    assert.equal(preferencesPatchSchema.safeParse({ theme: "dark" }).success, true);
    assert.equal(preferencesPatchSchema.safeParse({ theme: "dark", admin: true }).success, false);
    assert.equal(preferencesPatchSchema.safeParse({ accent: "purple" }).success, false);
    assert.equal(preferencesPatchSchema.safeParse({ layout: { classOrder: Array(201).fill("x") } }).success, false);
  });

  it("orders items by saved ids, new items last", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    assert.deepEqual(orderByIds(items, ["c", "a", "gone"]).map((i) => i.id), ["c", "a", "b", "d"]);
  });
});

describe("single-key shortcuts setting", () => {
  it("defaults on and accepts a boolean", () => {
    assert.equal(DEFAULT_PREFERENCES.singleKeyShortcuts, true);
    assert.equal(mergePreferences(DEFAULT_PREFERENCES, { singleKeyShortcuts: false }).singleKeyShortcuts, false);
    assert.equal(normalizePreferences({ singleKeyShortcuts: "no" }).singleKeyShortcuts, true);
    assert.equal(preferencesPatchSchema.safeParse({ singleKeyShortcuts: "off" }).success, false);
  });
});
