// Demo goal parser: reads a grade goal from free text without an AI model.
// Pure: safe for client components, server code, and unit tests.
//
// It understands letters ("an A", "a B+", "C minus"), percents ("90%",
// "85 percent"), bare scores after a goal word ("at least 85", "get a 90"),
// a bare score or letter on its own ("93", "b+"), and "pass". The class is
// matched by keywords from the class name and subject. Letters convert with
// the planner's own scale (src/lib/goals/plan.ts).
//
// A goal often names two grades: "I have a B and want an A", "I'm at 82% and
// need 90%". Every grade in the text is a candidate, and the words just
// before each one decide what it is: after a goal word ("want", "need",
// "aim for", "to") it is the target; after a current-standing word ("have",
// "currently", "at", "I'm") it is where the student is now and is skipped.
// The first goal-marked candidate wins; otherwise the last unmarked one.

import {
  clampPercent,
  letterToPercent,
  normalizeLetter,
  PASS_LABEL,
  PASS_PERCENT,
  percentLabel,
  type LetterTarget,
} from "@/lib/goals/plan";

export type GoalClassOption = {
  id: string;
  name: string;
  subject?: string | null;
  section?: string | null;
};

export type ParsedTarget = { targetPercent: number; targetLabel: string };

export type ParsedGoal = ParsedTarget & { classId: string | null };

/** Longest goal the planner accepts, in characters. */
export const MAX_GOAL_CHARS = 300;

/** Shown when the only number in a goal looks like a GPA ("a 4.0", "3.5 GPA"). */
export const GPA_GOAL_MESSAGE =
  "The planner works with letter grades and percents, not GPA. Try “I need a B+” or “at least 85%”.";

const SIGN = String.raw`(?:\s*(\+|-|−|plus\b|minus\b))?`;
// "an A", "a B+", "a c minus": the article makes a lowercase letter unambiguous.
const ARTICLE_LETTER = new RegExp(String.raw`\ban?\s+([a-d])${SIGN}(?![a-z0-9'])`, "gi");
// "A-", "b+", "C plus": a sign makes the letter unambiguous in any case.
const SIGNED_LETTER = new RegExp(String.raw`(?<![a-z0-9])([a-d])\s*(\+|-|−|plus\b|minus\b)(?![a-z0-9])`, "gi");
// "A in English", "straight A's", "B or better", "...a B.": an uppercase letter standing alone.
const CAPITAL_LETTER =
  /(?<![A-Za-z0-9])([A-D])(?:'?s)?(?=\s+(?:in|or|for|this|overall|average|grade|at|on|by|and|so|please)\b|\s*[.,!?;:)]|\s*$)/g;

const PERCENT = /(?<![\d.])(\d{1,3}(?:\.\d+)?)\s*(?:%|percent\b|pct\b)/gi;
const GOAL_NUMBER =
  /\b(?:at\s+least|above|over|minimum(?:\s+of)?|min|aim\s+for|aiming\s+for|get|score|reach|hit|need|want|keep|stay\s+above|end\s+(?:up\s+)?with|finish\s+with)\s+(?:an?\s+)?(?:my\s+|solid\s+)?(\d{1,3}(?:\.\d+)?)(?!\d|\.\d|[a-z])(?!\s*(?:\/|out\s+of|points?\b|pts\b|assignments?\b|days?\b|hours?\b|more\b|gpa\b))/gi;
const PASS = /\b(?:pass|passing|passed)\b/i;
// The whole goal is one score ("93", "87.5") or one letter ("b+", "A").
const BARE_NUMBER = /^\s*(\d{1,3}(?:\.\d+)?)\s*[.!]?\s*$/;
const BARE_LETTER = /^\s*([a-d])\s*(\+|-|−|plus|minus)?\s*[.!]?\s*$/i;
// "4.0", "3.5", or anything followed by "GPA".
const GPA_NUMBER = /(?<![\d.])[0-4]\.\d{1,2}(?![\d%])(?!\s*(?:%|percent\b|pct\b))|\bgpa\b/i;

/** Numbers at or below this, without a percent sign, read as a GPA, not a target. */
const GPA_MAX = 4;

function letterTarget(letter: string, sign: string | undefined): ParsedTarget | null {
  const normalized: LetterTarget | null = normalizeLetter(`${letter}${sign ? normalizeSign(sign) : ""}`);
  if (!normalized) return null;
  const percent = letterToPercent(normalized);
  return percent === null ? null : { targetPercent: percent, targetLabel: normalized };
}

function normalizeSign(sign: string): string {
  const lower = sign.toLowerCase();
  return lower === "plus" || lower === "+" ? "+" : "-";
}

function numberTarget(raw: string, { explicitPercent }: { explicitPercent: boolean }): ParsedTarget | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  // "a 4.0" or "a 3" is a GPA or a rubric level, never a 4% goal. "4%" is taken as written.
  if (!explicitPercent && value <= GPA_MAX) return null;
  const percent = clampPercent(value);
  return { targetPercent: percent, targetLabel: percentLabel(percent) };
}

// Words that make the grade right after them the student's target.
const GOAL_WORDS = new Set([
  "want", "wanna", "need", "needs", "aim", "aiming", "get", "reach", "hit", "score", "keep", "stay",
  "finish", "end", "earn", "make", "target", "goal", "least", "above", "over", "minimum", "min",
  "like", "hope", "hoping", "try", "trying", "wish", "shoot", "shooting", "going", "raise", "bring",
]);
// Goal words that only count right before the grade: "to an A", "for a B+".
const ADJACENT_GOAL_WORDS = new Set(["to", "for"]);
// Words that make the grade right after them where the student is now.
const CURRENT_WORDS = new Set([
  "have", "has", "had", "got", "getting", "currently", "current", "at", "am", "i'm", "im", "from", "sitting",
]);
// "to have an A", "be at 90%", "will get": after these a current word is part of a goal phrase.
const INFINITIVE_WORDS = new Set(["to", "be", "will", "would", "should", "could", "i'd"]);
// "my grade is a C" is where the student is; "my goal is an A" is the target: the word before decides.
const LINKING_WORDS = new Set(["is", "was"]);

/** How many words before a grade are read for context. */
const CONTEXT_WORDS = 5;

type Role = "goal" | "current" | "none";

/** What the words just before a grade say about it, within the same sentence. */
function roleBefore(text: string, start: number): Role {
  const sentence = text.slice(0, start).split(/[.!?;](?=\s|$)/).pop() ?? "";
  const words = sentence.toLowerCase().replace(/[\u2018\u2019]/g, "'").match(/[a-z']+|\d+(?:\.\d+)?/g) ?? [];
  const recent = words.slice(-CONTEXT_WORDS);
  for (let index = recent.length - 1; index >= 0; index--) {
    const word = recent[index];
    if (ADJACENT_GOAL_WORDS.has(word)) {
      if (index === recent.length - 1) return "goal";
      continue;
    }
    if (GOAL_WORDS.has(word)) return "goal";
    if (LINKING_WORDS.has(word)) return GOAL_WORDS.has(recent[index - 1] ?? "") ? "goal" : "current";
    if (CURRENT_WORDS.has(word)) {
      if (INFINITIVE_WORDS.has(recent[index - 1] ?? "")) continue;
      return "current";
    }
  }
  return "none";
}

type Candidate = { start: number; end: number; target: ParsedTarget; role: Role };

/** Every grade in the text, in order, with what the words before it say about it. */
function candidates(goal: string): Candidate[] {
  const found: Candidate[] = [];
  const overlaps = (start: number, end: number) => found.some((other) => start < other.end && other.start < end);
  const add = (start: number, end: number, target: ParsedTarget | null, role?: Role) => {
    if (!target || overlaps(start, end)) return;
    found.push({ start, end, target, role: role ?? roleBefore(goal, start) });
  };

  // Higher-priority patterns first: a later match that overlaps an earlier one is the same grade.
  for (const pattern of [ARTICLE_LETTER, SIGNED_LETTER]) {
    for (const match of goal.matchAll(pattern)) {
      add(match.index, match.index + match[0].length, letterTarget(match[1], match[2]));
    }
  }
  for (const match of goal.matchAll(CAPITAL_LETTER)) {
    add(match.index, match.index + match[0].length, letterTarget(match[1], undefined));
  }
  for (const match of goal.matchAll(PERCENT)) {
    add(match.index, match.index + match[0].length, numberTarget(match[1], { explicitPercent: true }));
  }
  for (const match of goal.matchAll(GOAL_NUMBER)) {
    // The pattern starts with a goal word, so the number is always a target.
    const end = match.index + match[0].length;
    add(end - match[1].length, end, numberTarget(match[1], { explicitPercent: false }), "goal");
  }
  return found.sort((a, b) => a.start - b.start);
}

/**
 * The grade target in a goal, or null when there isn't one. The first grade
 * after a goal word wins ("I have a B and want an A" is an A); otherwise the
 * last grade that isn't the student's current standing.
 */
export function parseTarget(text: string): ParsedTarget | null {
  const goal = text.slice(0, MAX_GOAL_CHARS * 2);

  const bareNumber = goal.match(BARE_NUMBER);
  if (bareNumber) return numberTarget(bareNumber[1], { explicitPercent: false });
  const bareLetter = goal.match(BARE_LETTER);
  if (bareLetter) return letterTarget(bareLetter[1], bareLetter[2]);

  const found = candidates(goal);
  const target = found.find((candidate) => candidate.role === "goal") ?? found.filter((candidate) => candidate.role === "none").pop();
  if (target) return target.target;

  if (PASS.test(goal)) return { targetPercent: PASS_PERCENT, targetLabel: PASS_LABEL };
  return null;
}

/** Whether a goal names a GPA ("a 4.0", "3.5 GPA"), which the planner can't plan for. */
export function mentionsGpa(text: string): boolean {
  return GPA_NUMBER.test(text.slice(0, MAX_GOAL_CHARS * 2));
}

// Words that say nothing about which class a goal is for.
const STOPWORDS = new Set([
  "the", "and", "for", "class", "course", "grade", "grades", "period", "section", "need", "want", "get",
  "this", "that", "with", "least", "pass", "passing", "score", "term", "semester", "quarter", "year",
  "final", "overall", "average", "keep", "stay", "above", "over", "into", "from", "just", "please",
  "help", "plan", "goal", "really", "would", "like", "have", "make", "sure", "end", "finish", "aim",
  "at", "in", "on", "an", "my", "to", "be", "or", "of", "a", "i", "me", "it", "is", "so", "do",
  "language", "arts", "general", "intro", "introduction", "honors", "level",
]);

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+/g) ?? [];
}

function classKeywords(option: GoalClassOption): string[] {
  const all = [...words(option.name), ...words(option.subject ?? "")];
  return [...new Set(all.filter((word) => word.length >= 3 && !STOPWORDS.has(word)))];
}

/**
 * How strongly a goal mentions a class: the full class name scores highest,
 * then each keyword ("english", "science") the goal names or abbreviates
 * ("eng", "sci", "enviro").
 */
export function classMentionScore(goal: string, option: GoalClassOption): number {
  const text = goal.toLowerCase();
  let score = 0;
  const name = option.name.trim().toLowerCase();
  if (name && text.includes(name)) score += 10;

  const goalWords = words(goal).filter((word) => word.length >= 3 && !STOPWORDS.has(word));
  for (const keyword of classKeywords(option)) {
    if (goalWords.includes(keyword)) {
      score += 2;
    } else if (goalWords.some((word) => keyword.startsWith(word))) {
      score += 1;
    }
  }
  return score;
}

/** The one class a goal names, or null when it names none (or two equally). */
export function matchClass(goal: string, classes: readonly GoalClassOption[]): string | null {
  let best: { id: string; score: number } | null = null;
  let tied = false;
  for (const option of classes) {
    const score = classMentionScore(goal, option);
    if (score <= 0) continue;
    if (!best || score > best.score) {
      best = { id: option.id, score };
      tied = false;
    } else if (score === best.score) {
      tied = true;
    }
  }
  return best && !tied ? best.id : null;
}

/**
 * The demo planner's reading of a goal: the target and, when the goal names
 * one, the class. Null when there is no grade target in the text.
 */
export function parseGoal(text: string, classes: readonly GoalClassOption[]): ParsedGoal | null {
  const target = parseTarget(text);
  if (!target) return null;
  return { ...target, classId: matchClass(text, classes) };
}
