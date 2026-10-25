import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isStaleGradingClaim, STALE_GRADING_CLAIM_MS } from "@/lib/constants";
import { cellStateFor } from "@/lib/gradebook/types";

const now = Date.UTC(2026, 9, 25, 12, 0, 0);
const fresh = new Date(now - 60_000);
const stale = new Date(now - STALE_GRADING_CLAIM_MS - 1);

describe("gradebook cell state", () => {
  it("only teacher-approved grades count as published", () => {
    assert.equal(cellStateFor("PUBLISHED", true), "published");
    assert.equal(cellStateFor("NEEDS_REVIEW", false), "in_review");
    assert.equal(cellStateFor(null, false), "missing");
  });

  it("treats an abandoned GRADING claim as ready for another AI pass", () => {
    assert.equal(isStaleGradingClaim("GRADING", stale, now), true);
    assert.equal(isStaleGradingClaim("GRADING", fresh, now), false);
    assert.equal(isStaleGradingClaim("SUBMITTED", stale, now), false);
    assert.equal(cellStateFor("GRADING", false, stale, now), "ready");
    assert.equal(cellStateFor("GRADING", false, fresh, now), "grading");
    assert.equal(cellStateFor("GRADING", false), "grading");
  });

  it("a published grade wins over any status", () => {
    assert.equal(cellStateFor("GRADING", true, stale, now), "published");
  });
});
