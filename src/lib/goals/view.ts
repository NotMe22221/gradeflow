// Builds the goal planner's view model. Pure: safe for client components,
// server code, and unit tests.

import { isPastDue } from "@/components/student/student-status";
import { parseBreakdown, type BreakdownItem } from "@/lib/grades/breakdown";
import { weakestCriteria } from "@/lib/goals/coaching";
import {
  describeTarget,
  GOAL_STATUS_DISPLAY,
  planGoal,
  statusMessage,
  type CompletedTask,
  type GoalPlan,
  type RemainingTask,
} from "@/lib/goals/plan";
import type { GoalClass, GoalPlanView } from "@/lib/goals/types";

/** One class as loaded from the database for this student (published grades only). */
export type GoalClassSource = {
  id: string;
  name: string;
  section: string | null;
  subject: string | null;
  assignments: {
    id: string;
    title: string;
    dueDate: Date | null;
    criteria: { maxPoints: number }[];
    /** This student's submission, if any. */
    submission: {
      status: string;
      published: { totalScore: number; maxScore: number; breakdown: string | BreakdownItem[] | null } | null;
    } | null;
  }[];
};

/**
 * Split a class into completed work (teacher-approved grades) and remaining
 * work (rubric points, no approved grade yet), and find the weakest criteria.
 * Assignments without rubric points don't count toward the grade yet.
 */
export function buildGoalClass(source: GoalClassSource, now: Date): GoalClass {
  const completed: CompletedTask[] = [];
  const remaining: RemainingTask[] = [];
  const breakdowns: BreakdownItem[][] = [];

  for (const assignment of source.assignments) {
    const published = assignment.submission?.published ?? null;
    if (published) {
      completed.push({
        assignmentId: assignment.id,
        title: assignment.title,
        score: published.totalScore,
        maxScore: published.maxScore,
      });
      breakdowns.push(
        typeof published.breakdown === "string" || published.breakdown === null
          ? parseBreakdown(published.breakdown)
          : published.breakdown
      );
      continue;
    }
    const maxScore = assignment.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
    if (!(maxScore > 0)) continue;
    const status = assignment.submission?.status ?? null;
    const needsWork = status === null || status === "RETURNED";
    remaining.push({
      assignmentId: assignment.id,
      title: assignment.title,
      maxScore,
      dueDate: assignment.dueDate,
      pastDue: needsWork && isPastDue(assignment.dueDate, now),
      submitted: !needsWork,
    });
  }

  return {
    id: source.id,
    name: source.name,
    section: source.section,
    subject: source.subject,
    completed,
    remaining,
    weakest: weakestCriteria(breakdowns),
  };
}

function isoDate(value: Date | string | null): string | null {
  if (value === null) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Plan a goal for one class and shape it for the UI. */
export function buildPlanView(input: {
  goalClass: GoalClass;
  goalText: string;
  target: { percent: number; label: string };
  coachingTip: string;
  tipSource: "model" | "template";
  clarifyingQuestion?: string | null;
  savedAt: Date;
  plan?: GoalPlan;
}): GoalPlanView {
  const { goalClass } = input;
  const plan =
    input.plan ??
    planGoal({ targetPercent: input.target.percent, completed: goalClass.completed, remaining: goalClass.remaining });
  const target = { percent: plan.targetPercent, label: input.target.label };
  const description = describeTarget(target);
  const display = GOAL_STATUS_DISPLAY[plan.status];

  return {
    classId: goalClass.id,
    className: goalClass.name,
    goalText: input.goalText,
    target: { ...target, description },
    interpretation: `${description} in ${goalClass.name}`,
    status: plan.status,
    statusLabel: display.label,
    statusTone: display.tone,
    statusMessage: statusMessage(plan),
    currentPercent: plan.currentPercent,
    gradedCount: goalClass.completed.length,
    earned: plan.earned,
    earnedMax: plan.earnedMax,
    remainingMax: plan.remainingMax,
    requiredPoints: plan.requiredPoints,
    requiredPercentOnRemaining: plan.requiredPercentOnRemaining,
    bestPossiblePercent: plan.bestPossiblePercent,
    tasks: plan.perTask.map((task) => ({
      assignmentId: task.assignmentId,
      title: task.title,
      maxScore: task.maxScore,
      neededScore: task.neededScore,
      neededPercent: task.neededPercent,
      dueDate: isoDate(task.dueDate),
      pastDue: task.pastDue,
      submitted: task.submitted,
    })),
    coachingTip: input.coachingTip,
    tipSource: input.tipSource,
    clarifyingQuestion: input.clarifyingQuestion ?? null,
    savedAt: input.savedAt.toISOString(),
  };
}
