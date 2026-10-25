import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ACTIVITY_KINDS,
  computeStreak,
  dayKey,
  describeActivity,
  isActivityKind,
  levelFor,
  levelSummary,
  ONCE_PER_DAY,
  shortTitle,
  streakSummary,
  submissionXpAwards,
  totalXp,
  XP_PER_LEVEL,
  XP_RULES,
  xpForPublishedGrade,
} from "@/lib/gamification/rules";

/** A local date at noon, so day keys never straddle midnight. */
function day(offset: number, base = new Date(2026, 9, 25, 12)): Date {
  const date = new Date(base);
  date.setDate(date.getDate() + offset);
  return date;
}

describe("levels", () => {
  it("starts at level 1 and fills the bar inside a level", () => {
    assert.deepEqual(levelFor(0), { level: 1, xp: 0, intoLevel: 0, levelSize: XP_PER_LEVEL, percent: 0 });
    assert.deepEqual(levelFor(640), { level: 3, xp: 640, intoLevel: 140, levelSize: 250, percent: 56 });
    assert.equal(levelFor(250).level, 2);
    assert.equal(levelFor(249).intoLevel, 249);
  });

  it("ignores negative and fractional XP", () => {
    assert.equal(levelFor(-30).xp, 0);
    assert.equal(levelFor(99.9).xp, 99);
  });

  it("summarizes progress to the next level", () => {
    assert.equal(levelSummary(levelFor(640)), "Level 3 · 140 / 250 XP to Level 4");
    assert.equal(levelSummary(levelFor(0)), "Level 1 · 0 / 250 XP to Level 2");
  });
});

describe("streaks", () => {
  const now = day(0);

  it("counts consecutive days ending today", () => {
    const streak = computeStreak([day(0), day(-1), day(-2), day(-3), day(-6)], now);
    assert.equal(streak.current, 4);
    assert.equal(streak.activeToday, true);
    assert.equal(streak.longest, 4);
  });

  it("keeps a streak alive through today when yesterday was active", () => {
    const streak = computeStreak([day(-1), day(-2)], now);
    assert.equal(streak.current, 2);
    assert.equal(streak.activeToday, false);
  });

  it("breaks after a full missed day", () => {
    const streak = computeStreak([day(-2), day(-3), day(-4)], now);
    assert.equal(streak.current, 0);
    assert.equal(streak.longest, 3);
  });

  it("counts several activities on one day once", () => {
    const morning = new Date(2026, 9, 25, 8);
    const evening = new Date(2026, 9, 25, 21);
    assert.equal(computeStreak([morning, evening], now).current, 1);
  });

  it("handles no activity", () => {
    assert.deepEqual(computeStreak([], now), { current: 0, activeToday: false, longest: 0 });
  });

  it("summarizes the streak in plain words", () => {
    assert.deepEqual(streakSummary({ current: 4, activeToday: true, longest: 6 }), {
      headline: "4-day streak",
      detail: "Active today",
    });
    assert.deepEqual(streakSummary({ current: 2, activeToday: false, longest: 2 }), {
      headline: "2-day streak",
      detail: "Study today to keep it going",
    });
    assert.deepEqual(streakSummary({ current: 0, activeToday: false, longest: 3 }), {
      headline: "No streak yet",
      detail: "Study today to start one",
    });
  });

  it("uses local calendar day keys", () => {
    assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
  });
});

describe("XP rules", () => {
  it("scales published-grade XP with the score, 0 to 50", () => {
    assert.equal(xpForPublishedGrade(18, 20), 45);
    assert.equal(xpForPublishedGrade(0, 20), 0);
    assert.equal(xpForPublishedGrade(25, 20), 50);
    assert.equal(xpForPublishedGrade(5, 0), 0);
  });

  it("limits study sessions and goals to once per day", () => {
    assert.deepEqual([...ONCE_PER_DAY].sort(), ["GOAL_SET", "STUDY_SESSION"]);
  });

  it("totals XP defensively", () => {
    assert.equal(totalXp([{ xp: 50 }, { xp: 25 }, { xp: -10 }, { xp: Number.NaN }]), 75);
    assert.equal(totalXp([]), 0);
  });

  it("recognizes activity kinds", () => {
    for (const kind of ACTIVITY_KINDS) assert.equal(isActivityKind(kind), true);
    assert.equal(isActivityKind("PUBLISH_GRADE_FOR_ME"), false);
  });
});

describe("submission XP", () => {
  const none = new Set<string>();

  it("awards SUBMIT for a first submission, plus ON_TIME before the due date", () => {
    assert.deepEqual(submissionXpAwards({ resubmission: false, onTime: true, alreadyAwarded: none }), [
      { kind: "SUBMIT", xp: XP_RULES.SUBMIT },
      { kind: "ON_TIME", xp: XP_RULES.ON_TIME },
    ]);
    assert.deepEqual(submissionXpAwards({ resubmission: false, onTime: false, alreadyAwarded: none }), [
      { kind: "SUBMIT", xp: XP_RULES.SUBMIT },
    ]);
  });

  it("awards RESUBMIT (and no on-time bonus) for a resubmission", () => {
    assert.deepEqual(submissionXpAwards({ resubmission: true, onTime: true, alreadyAwarded: none }), [
      { kind: "RESUBMIT", xp: XP_RULES.RESUBMIT },
    ]);
  });

  it("never awards the same kind twice for one submission", () => {
    assert.deepEqual(
      submissionXpAwards({ resubmission: false, onTime: true, alreadyAwarded: new Set(["SUBMIT"]) }),
      [{ kind: "ON_TIME", xp: XP_RULES.ON_TIME }]
    );
    assert.deepEqual(
      submissionXpAwards({ resubmission: false, onTime: true, alreadyAwarded: new Set(["SUBMIT", "ON_TIME"]) }),
      []
    );
    assert.deepEqual(submissionXpAwards({ resubmission: true, onTime: false, alreadyAwarded: new Set(["RESUBMIT"]) }), []);
  });
});

describe("activity labels", () => {
  it("shortens long assignment titles at the colon", () => {
    assert.equal(shortTitle("Persuasive Essay: Should Our School Adopt a Four-Day Week?"), "Persuasive Essay");
    assert.equal(shortTitle("Lab: Water"), "Lab: Water");
    assert.equal(shortTitle("Reading Log"), "Reading Log");
  });

  it("describes each kind of XP event", () => {
    const essay = "Persuasive Essay: Should Our School Adopt a Four-Day Week?";
    assert.equal(describeActivity("SUBMIT", essay), "Submitted Persuasive Essay");
    assert.equal(describeActivity("ON_TIME", essay), "On time: Persuasive Essay");
    assert.equal(describeActivity("RESUBMIT", essay), "Resubmitted Persuasive Essay");
    assert.equal(describeActivity("GRADE_PUBLISHED", essay), "Graded: Persuasive Essay");
    assert.equal(describeActivity("STUDY_SESSION", essay), "Studied Persuasive Essay");
    assert.equal(describeActivity("GOAL_SET", "English 10"), "Set a goal in English 10");
  });

  it("falls back to generic wording without a related title", () => {
    assert.equal(describeActivity("SUBMIT", null), "Submitted a paper");
    assert.equal(describeActivity("STUDY_SESSION", null), "Study session");
    assert.equal(describeActivity("UNKNOWN", null), "Activity");
  });
});
