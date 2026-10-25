// XP, levels, and study streaks for the student dashboard.
// Pure: safe for client components, server code, and unit tests.

export const ACTIVITY_KINDS = [
  "SUBMIT", // submitted a paper
  "ON_TIME", // bonus: submitted before the due date
  "RESUBMIT", // revised and resubmitted after a send-back
  "GRADE_PUBLISHED", // a grade was published (scaled by the score)
  "STUDY_SESSION", // logged a study session from the inbox (once per day)
  "GOAL_SET", // planned a grade goal (once per day)
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const XP_RULES = {
  SUBMIT: 50,
  ON_TIME: 25,
  RESUBMIT: 40,
  STUDY_SESSION: 15,
  GOAL_SET: 10,
} as const;

/** Kinds that can be earned at most once per calendar day. */
export const ONCE_PER_DAY: ActivityKind[] = ["STUDY_SESSION", "GOAL_SET"];

/** XP for a published grade: half a point per percentage point, so 0 to 50. */
export function xpForPublishedGrade(totalScore: number, maxScore: number): number {
  if (!(maxScore > 0)) return 0;
  const percent = Math.max(0, Math.min(1, totalScore / maxScore)) * 100;
  return Math.round(percent / 2);
}

export const XP_PER_LEVEL = 250;

export type LevelProgress = {
  level: number;
  xp: number;
  /** XP earned inside the current level. */
  intoLevel: number;
  /** XP needed to reach the next level from the start of this one. */
  levelSize: number;
  /** 0..100 for a progress bar. */
  percent: number;
};

export function levelFor(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const intoLevel = xp % XP_PER_LEVEL;
  return { level, xp, intoLevel, levelSize: XP_PER_LEVEL, percent: Math.round((intoLevel / XP_PER_LEVEL) * 100) };
}

/** Local calendar day key, e.g. "2026-10-25". */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type StreakInfo = {
  /** Consecutive days with activity, ending today or yesterday. */
  current: number;
  /** Whether today already counts. */
  activeToday: boolean;
  longest: number;
};

/**
 * Study streak from activity timestamps. A streak stays alive through today
 * if the student was active yesterday, so it only breaks after a full missed day.
 */
export function computeStreak(activityDates: Date[], now: Date = new Date()): StreakInfo {
  const days = new Set(activityDates.map(dayKey));
  const today = dayKey(now);
  const activeToday = days.has(today);

  const cursor = new Date(now);
  if (!activeToday) cursor.setDate(cursor.getDate() - 1);
  let current = 0;
  while (days.has(dayKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const key of sorted) {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (previous) {
      const next = new Date(previous);
      next.setDate(next.getDate() + 1);
      run = dayKey(next) === key ? run + 1 : 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    previous = date;
  }

  return { current, activeToday, longest: Math.max(longest, current) };
}
