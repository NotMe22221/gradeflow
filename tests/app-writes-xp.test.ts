import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { activityIdFor } from "@/lib/gamification/activity-id";
import {
  ACTIVITY_KINDS,
  dayBounds,
  dayKey,
  ONCE_PER_DAY,
  ONCE_PER_SUBMISSION,
  xpOnceKey,
} from "@/lib/gamification/rules";
import { idSchema } from "@/lib/validation/id";

// Once-only XP is stored under a key-derived primary key, so the database
// itself refuses a second copy (see src/lib/gamification/award.ts).

const ava = "cmavaquillon000000000001";
const milo = "cmmilobrightwater0000001";
const paper = "cmsubmission000000000001";

describe("XP once keys", () => {
  it("covers every kind with a once rule", () => {
    assert.deepEqual([...ONCE_PER_DAY, ...ONCE_PER_SUBMISSION].sort(), [...ACTIVITY_KINDS].sort());
  });

  it("keys once-per-day kinds by the server's calendar day", () => {
    const morning = new Date(2026, 9, 26, 0, 0, 0, 0);
    const night = new Date(2026, 9, 26, 23, 59, 59, 999);
    const nextDay = new Date(2026, 9, 27, 0, 0, 0, 0);
    for (const kind of ONCE_PER_DAY) {
      const key = xpOnceKey({ studentId: ava, kind, refId: "cmassignment1", now: morning });
      assert.ok(key);
      // Same day, any time and any assignment or class: the same award.
      assert.equal(xpOnceKey({ studentId: ava, kind, refId: "cmassignment2", now: night }), key);
      assert.notEqual(xpOnceKey({ studentId: ava, kind, refId: "cmassignment1", now: nextDay }), key);
      assert.notEqual(xpOnceKey({ studentId: milo, kind, refId: "cmassignment1", now: morning }), key);
    }
    assert.notEqual(
      xpOnceKey({ studentId: ava, kind: "STUDY_SESSION", now: morning }),
      xpOnceKey({ studentId: ava, kind: "GOAL_SET", now: morning })
    );
  });

  it("keys once-per-submission kinds by the submission, on any day", () => {
    const now = new Date(2026, 9, 26, 9);
    const later = new Date(2026, 11, 1, 9);
    for (const kind of ONCE_PER_SUBMISSION) {
      const key = xpOnceKey({ studentId: ava, kind, refId: paper, now });
      assert.ok(key);
      assert.equal(xpOnceKey({ studentId: ava, kind, refId: paper, now: later }), key);
      assert.notEqual(xpOnceKey({ studentId: ava, kind, refId: "cmsubmission000000000002", now }), key);
    }
    assert.notEqual(
      xpOnceKey({ studentId: ava, kind: "SUBMIT", refId: paper, now }),
      xpOnceKey({ studentId: ava, kind: "ON_TIME", refId: paper, now })
    );
    // Without a submission there is nothing to key on.
    assert.equal(xpOnceKey({ studentId: ava, kind: "GRADE_PUBLISHED", refId: null, now }), null);
  });
});

describe("XP activity ids", () => {
  it("are deterministic, fixed-length ids the app accepts", () => {
    const key = xpOnceKey({ studentId: ava, kind: "SUBMIT", refId: paper, now: new Date() });
    assert.ok(key);
    const id = activityIdFor(key);
    assert.match(id, /^xp_[0-9a-f]{32}$/);
    assert.equal(activityIdFor(key), id);
    assert.equal(idSchema.safeParse(id).success, true);
    assert.notEqual(activityIdFor(`${key}x`), id);
  });
});

describe("dayBounds", () => {
  it("spans exactly the calendar day dayKey() names", () => {
    for (const date of [new Date(2026, 9, 26, 13, 5), new Date(2026, 2, 8, 12), new Date(2026, 10, 1, 0, 30), new Date(2026, 11, 31, 23, 59)]) {
      const { start, end } = dayBounds(date);
      assert.equal(dayKey(start), dayKey(date));
      assert.equal(dayKey(new Date(end.getTime() - 1)), dayKey(date));
      assert.notEqual(dayKey(end), dayKey(date));
      assert.ok(start.getTime() <= date.getTime() && date.getTime() < end.getTime());
    }
  });
});
