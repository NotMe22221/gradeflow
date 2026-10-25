// Goal-seeking math for the student planner. Pure: safe for client
// components, server code, and unit tests.
//
// The AI never does this arithmetic. A model (or the demo parser) only reads
// the student's goal ("I need a B+ in English 10"); every number the student
// sees is computed here from teacher-approved grades and rubric points.
//
// The grade is points-based: total points earned / total points possible
// across every assignment in the class (completed + remaining).

// --- Letter-grade scale -------------------------------------------------------

/** The bottom of each letter's range, in percent. A bare letter means this. */
export const LETTER_BASE_PERCENT = { A: 90, B: 80, C: 70, D: 60 } as const;
export type BaseLetter = keyof typeof LETTER_BASE_PERCENT;

/** "+" adds this many points to the bottom of the range (B+ is 87%). */
export const PLUS_BONUS = 7;

/** A passing grade: a D, the bottom of the D range. */
export const PASS_PERCENT = LETTER_BASE_PERCENT.D;
export const PASS_LABEL = "Pass";

/** Every letter target the planner understands, best first. */
export const LETTER_TARGETS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-"] as const;
export type LetterTarget = (typeof LETTER_TARGETS)[number];

/** One sentence for the UI so students know exactly how letters become percents. */
export const LETTER_SCALE_NOTE =
  "Letter scale: A 90%, B 80%, C 70%, D 60% (a pass). A plus adds 7 points (B+ is 87%). A minus counts as the bottom of its letter (A- is 90%).";

/**
 * Normalize a letter target ("a", "B plus", "c-", "A−") to its canonical form
 * ("A", "B+", "C-"), or null when it is not one.
 */
export function normalizeLetter(input: string): LetterTarget | null {
  const compact = input
    .trim()
    .toUpperCase()
    .replace(/[−–—]/g, "-") // minus sign and dashes typed on phones
    .replace(/\s*PLUS$/, "+")
    .replace(/\s*MINUS$/, "-")
    .replace(/\s+/g, "");
  return (LETTER_TARGETS as readonly string[]).includes(compact) ? (compact as LetterTarget) : null;
}

/** The target percent for a letter on this app's scale, or null for anything else. */
export function letterToPercent(input: string): number | null {
  const letter = normalizeLetter(input);
  if (!letter) return null;
  const base = LETTER_BASE_PERCENT[letter[0] as BaseLetter];
  return letter.endsWith("+") ? base + PLUS_BONUS : base;
}

export function isLetterTarget(label: string): label is LetterTarget {
  return (LETTER_TARGETS as readonly string[]).includes(label);
}

/** Clamp to 0..100; anything that is not a finite number becomes 0. */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/** "90", "87.5": at most one decimal, no trailing zeros. */
export function formatPercentValue(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** The label stored for a plain percent target, e.g. "85%". */
export function percentLabel(percent: number): string {
  return `${formatPercentValue(clampPercent(percent))}%`;
}

/**
 * How a target reads in the UI: "A (90%+)", "B+ (87%+)", "Pass (60%+)",
 * "85% or higher".
 */
export function describeTarget(target: { label: string; percent: number }): string {
  const percent = formatPercentValue(clampPercent(target.percent));
  if (isLetterTarget(target.label) || target.label === PASS_LABEL) return `${target.label} (${percent}%+)`;
  return `${percent}% or higher`;
}

// --- Planning -----------------------------------------------------------------

export type CompletedTask = {
  assignmentId: string;
  title: string;
  /** Teacher-approved points (PublishedGrade.totalScore). */
  score: number;
  maxScore: number;
};

export type RemainingTask = {
  assignmentId: string;
  title: string;
  /** Rubric points available. */
  maxScore: number;
  dueDate: Date | string | null;
  /** The student can still turn it in and its due day has ended (never a paper test). */
  pastDue: boolean;
  /** Turned in and waiting on the teacher (no approved grade yet). */
  submitted?: boolean;
  /** A paper test, taken in class and scanned by the teacher. */
  paperTest?: boolean;
  /** A paper test waiting for the teacher to scan it. */
  awaitingScan?: boolean;
};

export type GoalStatus = "secured" | "on_track" | "stretch" | "not_possible" | "no_remaining";

export type PlannedTask = {
  assignmentId: string;
  title: string;
  maxScore: number;
  /** Points to aim for, rounded UP to the nearest half point and capped at maxScore. */
  neededScore: number;
  /** neededScore as a percent of maxScore, one decimal. */
  neededPercent: number;
  dueDate: Date | string | null;
  pastDue: boolean;
  submitted: boolean;
  paperTest: boolean;
  awaitingScan: boolean;
};

export type GoalPlan = {
  targetPercent: number;
  /** Percent of the points on approved grades; null with no approved grades yet. */
  currentPercent: number | null;
  earned: number;
  earnedMax: number;
  remainingMax: number;
  /** Points still needed across the remaining work (0 once secured). */
  requiredPoints: number;
  /** requiredPoints as a percent of remainingMax; null with nothing remaining. */
  requiredPercentOnRemaining: number | null;
  status: GoalStatus;
  perTask: PlannedTask[];
  /** Final percent with full marks on everything remaining (0 when the class has no points at all). */
  bestPossiblePercent: number;
  /** Final percent with zeros on everything remaining (0 when the class has no points at all). */
  worstCasePercent: number;
};

/** Without approved grades to compare against, needing more than this on the rest is a stretch. */
export const STRETCH_WITHOUT_HISTORY_PERCENT = 85;

// Tolerance for floating-point noise (e.g. 0.74 * 25 = 18.499999999999996).
const EPSILON = 1e-6;

/** Round up to the nearest half point, ignoring floating-point noise. */
export function ceilToHalf(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value * 2 - EPSILON) / 2;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function points(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * What the student needs on each remaining assignment to finish at or above
 * `targetPercent`.
 *
 * Every remaining assignment gets the same share of its points (the required
 * percent on the remaining work). Each needed score is rounded up to the
 * nearest half point, so hitting every listed score always reaches the goal.
 */
export function planGoal(input: {
  targetPercent: number;
  completed: CompletedTask[];
  remaining: RemainingTask[];
}): GoalPlan {
  const targetPercent = clampPercent(input.targetPercent);

  const completed = input.completed.map((task) => {
    const maxScore = points(task.maxScore);
    return { maxScore, score: Math.min(points(task.score), maxScore) };
  });
  const earned = completed.reduce((sum, task) => sum + task.score, 0);
  const earnedMax = completed.reduce((sum, task) => sum + task.maxScore, 0);
  const remainingMax = input.remaining.reduce((sum, task) => sum + points(task.maxScore), 0);
  const totalMax = earnedMax + remainingMax;

  const currentPercent = earnedMax > 0 ? (earned / earnedMax) * 100 : null;
  const bestPossiblePercent = totalMax > 0 ? ((earned + remainingMax) / totalMax) * 100 : 0;
  const worstCasePercent = totalMax > 0 ? (earned / totalMax) * 100 : 0;

  const requiredTotal = (targetPercent / 100) * totalMax;
  const rawRequired = requiredTotal - earned;
  const requiredPoints = rawRequired > EPSILON ? rawRequired : 0;
  const requiredPercentOnRemaining = remainingMax > 0 ? (requiredPoints / remainingMax) * 100 : null;

  let status: GoalStatus;
  if (remainingMax <= 0) {
    status = "no_remaining";
  } else if (requiredPoints <= 0) {
    status = "secured";
  } else if (requiredPoints > remainingMax + EPSILON) {
    status = "not_possible";
  } else {
    const pace = currentPercent ?? STRETCH_WITHOUT_HISTORY_PERCENT;
    status = (requiredPercentOnRemaining ?? 0) <= pace + EPSILON ? "on_track" : "stretch";
  }

  const share = remainingMax > 0 ? Math.min(1, requiredPoints / remainingMax) : 0;
  const perTask: PlannedTask[] =
    status === "no_remaining"
      ? []
      : input.remaining.map((task) => {
          const maxScore = points(task.maxScore);
          const neededScore = Math.min(maxScore, ceilToHalf(maxScore * share));
          return {
            assignmentId: task.assignmentId,
            title: task.title,
            maxScore,
            neededScore,
            neededPercent: maxScore > 0 ? round1((neededScore / maxScore) * 100) : 0,
            dueDate: task.dueDate,
            pastDue: task.pastDue,
            submitted: task.submitted ?? false,
            paperTest: task.paperTest ?? false,
            awaitingScan: task.awaitingScan ?? false,
          };
        });

  return {
    targetPercent,
    currentPercent,
    earned,
    earnedMax,
    remainingMax,
    requiredPoints,
    requiredPercentOnRemaining,
    status,
    perTask,
    bestPossiblePercent,
    worstCasePercent,
  };
}

// --- Status wording -----------------------------------------------------------

export type StatusTone = "success" | "default" | "warning" | "danger" | "secondary";

export const GOAL_STATUS_DISPLAY: Record<GoalStatus, { label: string; tone: StatusTone }> = {
  secured: { label: "Secured", tone: "success" },
  on_track: { label: "On track", tone: "default" },
  stretch: { label: "Stretch", tone: "warning" },
  not_possible: { label: "Not possible", tone: "danger" },
  no_remaining: { label: "Nothing left to plan", tone: "secondary" },
};

/** One plain sentence explaining the status, with the numbers that matter. */
export function statusMessage(plan: GoalPlan): string {
  const required = plan.requiredPercentOnRemaining;
  const current = plan.currentPercent;
  switch (plan.status) {
    case "secured":
      return `Your approved grades already lock this in. Even with zeros on the rest, you'd finish at ${formatPercentValue(plan.worstCasePercent)}%.`;
    case "on_track":
      return current === null
        ? `Average ${formatPercentValue(required ?? 0)}% on the work below and you'll get there.`
        : `You need ${formatPercentValue(required ?? 0)}% on what's left. You're at ${formatPercentValue(current)}% so far, so keep that pace.`;
    case "stretch":
      return current === null
        ? `Doable, but you'll need ${formatPercentValue(required ?? 0)}% on everything left.`
        : `Doable, but you'll need ${formatPercentValue(required ?? 0)}% on what's left, above your current ${formatPercentValue(current)}%.`;
    case "not_possible":
      return `Even full marks on everything left would reach ${formatPercentValue(plan.bestPossiblePercent)}%. Try a goal at or below that.`;
    case "no_remaining":
      if (current === null) return "There's no graded or upcoming work in this class yet.";
      return current + EPSILON >= plan.targetPercent
        ? `Everything is graded, and your ${formatPercentValue(current)}% meets this goal.`
        : `Everything is graded. You finished at ${formatPercentValue(current)}%, below this goal.`;
  }
}
