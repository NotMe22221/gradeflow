// Demo goal parser: reads a grade goal from free text without an AI model.
// Pure: safe for client components, server code, and unit tests.
//
// It understands letters ("an A", "a B+", "C minus"), percents ("90%",
// "85 percent"), bare scores after a goal word ("at least 85", "get a 90"),
// and "pass". The class is matched by keywords from the class name and
// subject. Letters convert with the planner's own scale (src/lib/goals/plan.ts).

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

const SIGN = String.raw`(?:\s*(\+|-|−|plus\b|minus\b))?`;
// "an A", "a B+", "a c minus": the article makes a lowercase letter unambiguous.
const ARTICLE_LETTER = new RegExp(String.raw`\ban?\s+([a-d])${SIGN}(?![a-z0-9'])`, "i");
// "A-", "b+", "C plus": a sign makes the letter unambiguous in any case.
const SIGNED_LETTER = new RegExp(String.raw`(?<![a-z0-9])([a-d])\s*(\+|-|−|plus\b|minus\b)(?![a-z0-9])`, "i");
// "A in English", "straight A's", "B or better", "...a B.": an uppercase letter standing alone.
const CAPITAL_LETTER =
  /(?<![A-Za-z0-9])([A-D])(?:'?s)?(?=\s+(?:in|or|for|this|overall|average|grade|at|on|by|and|so|please)\b|\s*[.,!?;:)]|\s*$)/;

const PERCENT = /(?<![\d.])(\d{1,3}(?:\.\d+)?)\s*(?:%|percent\b|pct\b)/i;
const GOAL_NUMBER =
  /\b(?:at\s+least|above|over|minimum(?:\s+of)?|min|aim\s+for|aiming\s+for|get|score|reach|hit|need|want|keep|stay\s+above|end\s+(?:up\s+)?with|finish\s+with)\s+(?:an?\s+)?(?:my\s+|solid\s+)?(\d{1,3}(?:\.\d+)?)(?!\d|\.\d|[a-z])(?!\s*(?:\/|out\s+of|points?\b|pts\b|assignments?\b|days?\b|hours?\b|more\b))/i;
const PASS = /\b(?:pass|passing|passed)\b/i;

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

function numberTarget(raw: string): ParsedTarget | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  const percent = clampPercent(value);
  return { targetPercent: percent, targetLabel: percentLabel(percent) };
}

/** The grade target in a goal, or null when there isn't one. Letters win over numbers. */
export function parseTarget(text: string): ParsedTarget | null {
  const goal = text.slice(0, MAX_GOAL_CHARS * 2);

  for (const pattern of [ARTICLE_LETTER, SIGNED_LETTER]) {
    const match = goal.match(pattern);
    if (match) {
      const target = letterTarget(match[1], match[2]);
      if (target) return target;
    }
  }
  const capital = goal.match(CAPITAL_LETTER);
  if (capital) {
    const target = letterTarget(capital[1], undefined);
    if (target) return target;
  }

  const percent = goal.match(PERCENT);
  if (percent) {
    const target = numberTarget(percent[1]);
    if (target) return target;
  }
  const number = goal.match(GOAL_NUMBER);
  if (number) {
    const target = numberTarget(number[1]);
    if (target) return target;
  }

  if (PASS.test(goal)) return { targetPercent: PASS_PERCENT, targetLabel: PASS_LABEL };
  return null;
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
