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

// --- Activity labels and summaries (pure) -------------------------------------

export function isActivityKind(value: string): value is ActivityKind {
  return (ACTIVITY_KINDS as readonly string[]).includes(value);
}

/** Total XP from activity rows, ignoring anything that is not a finite positive number. */
export function totalXp(rows: readonly { xp: number }[]): number {
  return rows.reduce((sum, row) => sum + (Number.isFinite(row.xp) && row.xp > 0 ? row.xp : 0), 0);
}

/**
 * "Persuasive Essay: Should Our School Adopt a Four-Day Week?" -> "Persuasive Essay".
 * Keeps the full title when the part before the colon is too short to stand alone.
 */
export function shortTitle(title: string): string {
  const trimmed = title.trim();
  const head = trimmed.split(":")[0]?.trim() ?? trimmed;
  return head.length >= 6 && head.length < trimmed.length ? head : trimmed;
}

/** How one XP event reads in a chip, e.g. "Submitted Persuasive Essay". */
export function describeActivity(kind: string, subject: string | null): string {
  const name = subject ? shortTitle(subject) : null;
  switch (kind) {
    case "SUBMIT":
      return name ? `Submitted ${name}` : "Submitted a paper";
    case "ON_TIME":
      return name ? `On time: ${name}` : "On-time bonus";
    case "RESUBMIT":
      return name ? `Resubmitted ${name}` : "Resubmitted a paper";
    case "GRADE_PUBLISHED":
      return name ? `Graded: ${name}` : "Grade published";
    case "STUDY_SESSION":
      return name ? `Studied ${name}` : "Study session";
    case "GOAL_SET":
      return name ? `Set a goal in ${name}` : "Set a grade goal";
    default:
      return "Activity";
  }
}

export type StreakSummary = { headline: string; detail: string };

/** "4-day streak" + "Active today" / "Study today to keep it going". */
export function streakSummary(streak: StreakInfo): StreakSummary {
  if (streak.current <= 0) return { headline: "No streak yet", detail: "Study today to start one" };
  return {
    headline: `${streak.current}-day streak`,
    detail: streak.activeToday ? "Active today" : "Study today to keep it going",
  };
}

/** "Level 3 · 140 / 250 XP to Level 4". */
export function levelSummary(level: LevelProgress): string {
  return `Level ${level.level} · ${level.intoLevel} / ${level.levelSize} XP to Level ${level.level + 1}`;
}

// --- Submission XP (pure) -----------------------------------------------------

export type XpAward = { kind: ActivityKind; xp: number };

/**
 * XP for a submission: SUBMIT (+ ON_TIME before the due date) for a first
 * submission, RESUBMIT for a resubmission after a send-back. Kinds already
 * awarded for this submission are skipped, so a submission never earns the
 * same kind twice.
 */
export function submissionXpAwards(input: {
  resubmission: boolean;
  onTime: boolean;
  alreadyAwarded: ReadonlySet<string>;
}): XpAward[] {
  const awards: XpAward[] = input.resubmission
    ? [{ kind: "RESUBMIT", xp: XP_RULES.RESUBMIT }]
    : [
        { kind: "SUBMIT", xp: XP_RULES.SUBMIT },
        ...(input.onTime ? [{ kind: "ON_TIME" as const, xp: XP_RULES.ON_TIME }] : []),
      ];
  return awards.filter((award) => !input.alreadyAwarded.has(award.kind));
}
