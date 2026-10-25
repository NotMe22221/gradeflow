// Conference brief data shapes. Pure: safe for client components, server
// code, and unit tests.

import type { SkillInsight } from "@/lib/insights/profile";

/** "openai": drafted by the OpenAI API (text model). "demo": local template, no API key. */
export type BriefEngine = "openai" | "demo";

/** The one-page brief, as the route returns it and the UI renders it. */
export type ConferenceBrief = {
  headline: string;
  summary: string;
  strengths: string[];
  growthAreas: string[];
  talkingPoints: string[];
  nextSteps: string[];
  questionsForFamily: string[];
};

/** Computed in code from the approved grades the brief was drafted from. */
export type BriefBasis = {
  publishedCount: number;
  /** Mean percent of the approved totals, one decimal; null with no approved grades. */
  averagePercent: number | null;
};

/** 200 body of POST /api/conference-brief. */
export type ConferenceBriefSuccess = {
  ok: true;
  engine: BriefEngine;
  /** The model that drafted it; null for the demo brief. */
  model: string | null;
  /** ISO timestamp. */
  generatedAt: string;
  brief: ConferenceBrief;
  basis: BriefBasis;
};

export type ConferenceBriefFailure = { ok: false; error: string };

export type ConferenceBriefResponse = ConferenceBriefSuccess | ConferenceBriefFailure;

/**
 * Everything the brief is drafted from: teacher-approved grades (scores,
 * per-criterion breakdown, teacher comments and feedback, publish dates),
 * upcoming assignments, and engagement. Never AI drafts, never the papers.
 */
export type BriefInput = {
  student: { name: string; firstName: string };
  class: { name: string; section: string | null; subject: string | null };
  /** Approved grades, oldest first. */
  grades: {
    assignment: string;
    score: number;
    maxScore: number;
    /** Whole percent; null when the max score is 0. */
    percent: number | null;
    /** YYYY-MM-DD. */
    publishedOn: string;
    teacherFeedback: string | null;
    criteria: {
      title: string;
      score: number;
      maxPoints: number;
      percent: number | null;
      teacherComment: string | null;
    }[];
  }[];
  /** Computed in code from per-criterion percentages (whole percents). */
  strengths: SkillInsight[];
  growthAreas: SkillInsight[];
  /** Not yet submitted and not past due, soonest first. */
  upcoming: { assignment: string; dueOn: string | null }[];
  /** App engagement. Not part of any grade. */
  engagement: { currentStreakDays: number; longestStreakDays: number; level: number; totalXp: number };
  basis: BriefBasis;
};
