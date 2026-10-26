import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createDragAnnouncer } from "@/components/layout-editor/announcements";

describe("layout editor drag announcements", () => {
  it("keeps 'Picked up' when dnd-kit first reports the item over its own spot", () => {
    const say = createDragAnnouncer("a column");
    assert.equal(
      say.start("stats", "This week", "position 1 of 3 in the main column"),
      "Picked up This week, position 1 of 3 in the main column."
    );
    // The first collision, in the same batch as the pick-up, is the section itself.
    assert.equal(say.over("This week", "stats", "position 1 of 3 in the main column"), undefined);
  });

  it("announces each new target, including a return to the starting spot", () => {
    const say = createDragAnnouncer("a column");
    say.start("stats", "This week", "position 1 of 3 in the main column");
    say.over("This week", "stats", "position 1 of 3 in the main column");
    assert.equal(
      say.over("This week", "tools", "position 2 of 3 in the main column"),
      "This week is over position 2 of 3 in the main column."
    );
    assert.equal(say.over("This week", "tools", "position 2 of 3 in the main column"), undefined);
    assert.equal(
      say.over("This week", "stats", "position 1 of 3 in the main column"),
      "This week is over position 1 of 3 in the main column."
    );
    assert.equal(say.over("This week", null, null), "This week is not over a column.");
  });

  it("says where a cancelled item went back to, even after the page restored the layout", () => {
    const say = createDragAnnouncer("a column");
    say.start("planner", "Goal planner", "position 4 of 4 in the main column");
    say.over("Goal planner", "recent", "position 1 of 2 in the side column");
    assert.equal(say.cancel("Goal planner"), "Cancelled. Goal planner went back to position 4 of 4 in the main column.");
    // A later pick-up starts fresh: its own spot is quiet again.
    say.start("recent", "Recently returned", "position 1 of 2 in the side column");
    assert.equal(say.over("Recently returned", "recent", "position 1 of 2 in the side column"), undefined);
  });

  it("words drops and positions it can't describe", () => {
    const say = createDragAnnouncer("a place");
    say.start("c1", "English 10", null);
    assert.equal(say.drop("English 10", "c2", "position 2 of 4"), "Dropped English 10 at position 2 of 4.");
    say.start("c1", "English 10", null);
    assert.equal(say.drop("English 10", null, null), "English 10 was dropped where it started.");
    say.start("c1", "English 10", null);
    assert.equal(say.over("English 10", null, null), "English 10 is not over a place.");
    assert.equal(say.cancel("English 10"), "Cancelled. English 10 went back.");
  });
});
