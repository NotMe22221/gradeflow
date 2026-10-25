// Coaching helpers for the goal planner. Pure: safe for client components,
// server code, and unit tests.
//
// - weakestCriteria(): the rubric criteria a student loses the most points
//   on, from teacher-approved breakdowns only.
// - resolveModelTarget(): turns the model's extraction into a target using
//   the planner's own letter scale (the model's percent is ignored whenever
//   it names a letter).
// - cleanModelText() / acceptCoachingTip(): length caps and the "no numbers"
//   rule for model-written text.
// - demoCoachingTip(): the template tip used without an API key.

import type { BreakdownItem } from "@/lib/grades/breakdown";
import {
  clampPercent,
  letterToPercent,
  normalizeLetter,
  PASS_LABEL,
  PASS_PERCENT,
  percentLabel,
  type GoalStatus,
} from "@/lib/goals/plan";
import type { ParsedTarget } from "@/lib/goals/parse";

export type WeakCriterion = {
  title: string;
  /** Mean percent earned on this criterion across approved grades. */
  percent: number;
};

/** How many weak criteria the planner looks at. */
export const WEAKEST_LIMIT = 3;

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * The lowest-scoring rubric criteria across a student's approved grades in
 * one class, merged by title, weakest first. Criteria at 100% are never
 * "weak". Ties keep rubric order.
 */
export function weakestCriteria(
  breakdowns: readonly (readonly BreakdownItem[])[],
  limit = WEAKEST_LIMIT
): WeakCriterion[] {
  const groups = new Map<string, { title: string; score: number; max: number; order: number }>();
  let order = 0;
  for (const breakdown of breakdowns) {
    for (const item of breakdown) {
      if (!(item.maxPoints > 0)) continue;
      const key = normalizeTitle(item.title);
      if (!key) continue;
      const group = groups.get(key) ?? { title: item.title.trim().replace(/\s+/g, " "), score: 0, max: 0, order: order++ };
      group.score += Math.min(Math.max(item.score, 0), item.maxPoints);
      group.max += item.maxPoints;
      groups.set(key, group);
    }
  }
  return [...groups.values()]
    .map((group) => ({ title: group.title, percent: (group.score / group.max) * 100, order: group.order }))
    .filter((group) => group.percent < 100)
    .sort((a, b) => a.percent - b.percent || a.order - b.order)
    .slice(0, limit)
    .map(({ title, percent }) => ({ title, percent: Math.round(percent * 10) / 10 }));
}

/** What the model extracted from the goal (structured output, before checks). */
export type ModelGoalExtraction = {
  class_id: string | null;
  target_letter: string | null;
  target_percent: number | null;
  interpretation: string;
  coaching_tip: string;
  clarifying_question: string | null;
};

/**
 * The target from the model's extraction, computed with the planner's scale.
 * A recognized letter always wins and its percent comes from letterToPercent
 * (the model's percent is ignored). "PASS" means a D. Otherwise a finite
 * percent is clamped to 0..100. Null when neither is usable.
 */
export function resolveModelTarget(extraction: Pick<ModelGoalExtraction, "target_letter" | "target_percent">): ParsedTarget | null {
  const letterText = extraction.target_letter?.trim() ?? "";
  if (letterText) {
    if (/^pass(ing)?$/i.test(letterText)) return { targetPercent: PASS_PERCENT, targetLabel: PASS_LABEL };
    const letter = normalizeLetter(letterText);
    const percent = letter ? letterToPercent(letter) : null;
    if (letter && percent !== null) return { targetPercent: percent, targetLabel: letter };
  }
  const raw = extraction.target_percent;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    // A model may answer 0.9 for 90%; anything at or below 1 is read as a fraction.
    const percent = clampPercent(raw <= 1 ? raw * 100 : raw);
    return { targetPercent: percent, targetLabel: percentLabel(percent) };
  }
  return null;
}

/** Collapse whitespace, strip control characters and markup brackets, and cap the length. */
export function cleanModelText(value: string | null | undefined, maxChars: number): string {
  if (!value) return "";
  const text = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export const MAX_TIP_CHARS = 280;
export const MAX_QUESTION_CHARS = 200;

/**
 * A model-written tip is shown only when it is a real sentence with no
 * digits: every number on the page must come from code, never the model.
 */
export function acceptCoachingTip(tip: string | null | undefined): string | null {
  const clean = cleanModelText(tip, MAX_TIP_CHARS);
  if (clean.length < 12) return null;
  if (/\d/.test(clean)) return null;
  return clean;
}

const CRITERION_ADVICE: [RegExp, string][] = [
  [/evidence|quot|citation|source|support/i, "pick one strong quotation per paragraph and explain in your own words what it proves"],
  [/counter|rebuttal|opposing/i, "name the strongest argument against your position, then answer it with a reason of your own"],
  [/organi[sz]|structure|style|writing|clarity|flow/i, "outline your paragraphs before drafting and give each one a clear topic sentence"],
  [/thesis|position|claim|argument|interpretation/i, "write your main claim as one sentence first, then check that every paragraph supports it"],
  [/hypothes|question/i, "turn your question into a testable prediction that says what you expect to change and why"],
  [/method|procedure/i, "write your steps so a classmate could repeat them exactly, including amounts and timing"],
  [/data|result|graph|table/i, "label every table and graph clearly, then describe the main pattern in one plain sentence"],
  [/analysis|conclusion|reasoning/i, "connect each conclusion back to a specific result, and say what it means"],
  [/grammar|mechanic|spelling|convention/i, "read your draft out loud once before submitting to catch missing words and run-ons"],
];

function adviceFor(title: string): string {
  for (const [pattern, advice] of CRITERION_ADVICE) {
    if (pattern.test(title)) return advice;
  }
  return "reread the full-credit description in the rubric and check your draft against it line by line";
}

/** The demo planner's study tip: template text keyed to the weakest criterion and the status. */
export function demoCoachingTip(weakest: readonly WeakCriterion[], status: GoalStatus): string {
  const focus = weakest[0];
  if (status === "secured") {
    return focus
      ? `You've got this goal covered. To keep growing, spend your next session on ${focus.title.toLowerCase()}: ${adviceFor(focus.title)}.`
      : "You've got this goal covered. Keep turning work in on time and read your teacher's feedback on each grade.";
  }
  if (status === "no_remaining") {
    return focus
      ? `For next time, put extra practice into ${focus.title.toLowerCase()}: ${adviceFor(focus.title)}.`
      : "Read through your teacher's feedback on each grade and note one thing to carry into your next class.";
  }
  if (!focus) {
    return "Start each assignment early, check your draft against every rubric criterion, and read your teacher's feedback as soon as a grade comes back.";
  }
  const opener = status === "not_possible" ? "Every point still counts." : status === "stretch" ? "This goal is within reach with focus." : "You're in a good spot.";
  return `${opener} Your biggest gains are in ${focus.title.toLowerCase()}, so ${adviceFor(focus.title)}.`;
}
