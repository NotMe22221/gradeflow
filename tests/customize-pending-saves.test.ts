import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createSaveTracker } from "@/components/customize/pending-saves";

// What a failed appearance save puts back on screen. Saves finish in the
// order they were made (Next runs server actions one at a time).

type Key = "theme" | "accent";
const STORED = { theme: "system", accent: "blue" };

/** Start a save the way saveAppearance does: `onScreen` is read just before the change shows. */
function start(tracker: ReturnType<typeof createSaveTracker<Key>>, screen: Record<Key, string>, patch: Partial<Record<Key, string>>) {
  const save = tracker.begin(patch, { ...screen });
  Object.assign(screen, patch);
  return save;
}

describe("appearance save tracker", () => {
  it("puts the stored value back when a single save fails", () => {
    const tracker = createSaveTracker<Key>();
    const screen = { ...STORED };
    const teal = start(tracker, screen, { accent: "teal" });
    assert.equal(tracker.pending.get("accent")?.value, "teal");
    assert.deepEqual(tracker.finish(teal, false), { accent: "blue" });
    assert.equal(tracker.pending.size, 0);
  });

  it("goes back to the stored value, not an unsaved one, when two quick saves both fail", () => {
    const tracker = createSaveTracker<Key>();
    const screen = { ...STORED };
    const teal = start(tracker, screen, { accent: "teal" });
    const pink = start(tracker, screen, { accent: "pink" }); // Teal is on screen but not stored.
    // The first failure leaves the newer change alone: it reports its own outcome.
    assert.deepEqual(tracker.finish(teal, false), {});
    assert.equal(tracker.pending.get("accent")?.value, "pink");
    assert.deepEqual(tracker.finish(pink, false), { accent: "blue" });
    assert.equal(tracker.pending.size, 0);
  });

  it("falls back to a value an earlier save stored", () => {
    const tracker = createSaveTracker<Key>();
    const screen = { ...STORED };
    const teal = start(tracker, screen, { accent: "teal" });
    const pink = start(tracker, screen, { accent: "pink" });
    assert.deepEqual(tracker.finish(teal, true), {});
    assert.deepEqual(tracker.finish(pink, false), { accent: "teal" });
  });

  it("keeps the newest value when an earlier save fails and the newer one succeeds", () => {
    const tracker = createSaveTracker<Key>();
    const screen = { ...STORED };
    const teal = start(tracker, screen, { accent: "teal" });
    const pink = start(tracker, screen, { accent: "pink" });
    assert.deepEqual(tracker.finish(teal, false), {});
    assert.deepEqual(tracker.finish(pink, true), {});
    assert.equal(tracker.pending.size, 0);
  });

  it("handles three quick changes with mixed results", () => {
    for (const [outcomes, expected] of [
      [[false, false, false], { accent: "blue" }],
      [[true, false, false], { accent: "teal" }],
      [[false, true, false], { accent: "pink" }],
      [[true, true, false], { accent: "pink" }],
      [[false, false, true], {}],
    ] as const) {
      const tracker = createSaveTracker<Key>();
      const screen = { ...STORED };
      const saves = ["teal", "pink", "green"].map((accent) => start(tracker, screen, { accent }));
      const reverts = saves.map((save, index) => tracker.finish(save, outcomes[index] as boolean));
      assert.deepEqual(reverts.slice(0, 2), [{}, {}], `only the newest save settles (${outcomes})`);
      assert.deepEqual(reverts[2], expected, `outcomes ${outcomes}`);
      assert.equal(tracker.pending.size, 0);
    }
  });

  it("tracks each setting on its own", () => {
    const tracker = createSaveTracker<Key>();
    const screen = { ...STORED };
    const dark = start(tracker, screen, { theme: "dark" });
    const teal = start(tracker, screen, { accent: "teal" });
    assert.deepEqual(tracker.finish(dark, false), { theme: "system" });
    assert.deepEqual(tracker.finish(teal, true), {});
    assert.equal(tracker.pending.size, 0);
  });

  it("reverts only the settings of a save that no newer change has replaced", () => {
    const tracker = createSaveTracker<Key>();
    const screen = { ...STORED };
    const both = start(tracker, screen, { theme: "dark", accent: "teal" });
    const pink = start(tracker, screen, { accent: "pink" });
    assert.deepEqual(tracker.finish(both, false), { theme: "system" });
    assert.deepEqual(tracker.finish(pink, false), { accent: "blue" });
  });

  it("ignores settings left undefined in a patch", () => {
    const tracker = createSaveTracker<Key>();
    const save = tracker.begin({ theme: "dark", accent: undefined }, { ...STORED });
    assert.deepEqual(save.values, { theme: "dark" });
    assert.deepEqual([...tracker.pending.keys()], ["theme"]);
    assert.deepEqual(tracker.finish(save, false), { theme: "system" });
  });
});
