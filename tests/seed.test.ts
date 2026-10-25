import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createClock } from "../prisma/seed-data/helpers";
import { engagementFor, validateDataset } from "../prisma/seed-data/validate";

describe("demo seed dataset", () => {
  it("passes its own consistency checks (evidence verbatim, totals, demo story)", () => {
    assert.doesNotThrow(() => validateDataset(createClock()));
  });

  it("leaves Ava's streak alive but not yet logged today, so the demo can log a session live", () => {
    const now = new Date();
    const activities = validateDataset(createClock(now));
    const ava = engagementFor(activities, "ava", now);
    assert.equal(ava.streak.current, 4);
    assert.equal(ava.streak.activeToday, false);
  });
});
