// Goal planner data shapes shared by the route, the page, and the client
// planner. Pure: safe for client components, server code, and unit tests.

import type { WeakCriterion } from "@/lib/goals/coaching";
import type { CompletedTask, GoalStatus, RemainingTask, StatusTone } from "@/lib/goals/plan";

/** "openai": the goal was read by the text model (gpt-4o-mini). "demo": the local regex parser. */
export type GoalEngine = "openai" | "demo";

/** One class as the planner sees it: only this student's teacher-approved grades. */
export type GoalClass = {
  id: string;
  name: string;
  section: string | null;
  subject: string | null;
  /** Assignments with a published grade for this student. */
  completed: CompletedTask[];
  /** Assignments with rubric points and no published grade for this student yet. */
  remaining: RemainingTask[];
  /** Lowest-scoring rubric criteria across the approved grades, weakest first. */
  weakest: WeakCriterion[];
};

export type GoalPlanTaskView = {
  assignmentId: string;
  title: string;
  maxScore: number;
  /** Rounded up to the nearest half point. */
  neededScore: number;
  neededPercent: number;
  /** ISO date or null. */
  dueDate: string | null;
  pastDue: boolean;
  /** Turned in, waiting on the teacher. */
  submitted: boolean;
};

/** The plan as the UI renders it. Every number here was computed in code. */
export type GoalPlanView = {
  classId: string;
  className: string;
  /** What the student typed (untrusted; render as text only). */
  goalText: string;
  target: {
    percent: number;
    /** "A", "B+", "Pass", or "85%". */
    label: string;
    /** "A (90%+)", "85% or higher". */
    description: string;
  };
  /** "A (90%+) in English 10". */
  interpretation: string;
  status: GoalStatus;
  statusLabel: string;
  statusTone: StatusTone;
  statusMessage: string;
  currentPercent: number | null;
  /** Approved grades the current standing is based on. */
  gradedCount: number;
  earned: number;
  earnedMax: number;
  remainingMax: number;
  requiredPoints: number;
  requiredPercentOnRemaining: number | null;
  bestPossiblePercent: number;
  tasks: GoalPlanTaskView[];
  coachingTip: string;
  /** "model": written by the text model (checked: no numbers). "template": the built-in tip. */
  tipSource: "model" | "template";
  clarifyingQuestion: string | null;
  /** ISO timestamp of when the goal was saved. */
  savedAt: string;
};

export type GoalPlannerErrorCode = "NEEDS_CLASS" | "UNCLEAR_GOAL" | "NO_CLASSES";

/** 200 body of POST /api/goal-planner. */
export type GoalPlannerSuccess = {
  ok: true;
  engine: GoalEngine;
  /** The model that read the goal; null for the demo planner. */
  model: string | null;
  plan: GoalPlanView;
  /** XP earned for setting the goal (0 when already earned today). */
  xpAwarded: number;
};

export type GoalPlannerFailure = { ok: false; error: string; code?: GoalPlannerErrorCode };

export type GoalPlannerResponse = GoalPlannerSuccess | GoalPlannerFailure;
