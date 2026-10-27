import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";

import { describeOpenAiError, getOpenAI, modelFor, openAiConfigured, openAiRequestOptions } from "@/lib/ai/openai";
import { transaction } from "@/lib/db";
import { insertAwards, unearnedAwards, type AwardInput } from "@/lib/gamification/award";
import { XP_RULES } from "@/lib/gamification/rules";
import {
  acceptCoachingTip,
  cleanModelText,
  demoCoachingTip,
  MAX_QUESTION_CHARS,
  resolveModelTarget,
} from "@/lib/goals/coaching";
import { GPA_GOAL_MESSAGE, mentionsGpa, parseGoal, type ParsedTarget } from "@/lib/goals/parse";
import { isLetterTarget, PASS_LABEL, planGoal } from "@/lib/goals/plan";
import { buildGoalUserPrompt, GOAL_SYSTEM_PROMPT, GoalExtractionSchema } from "@/lib/goals/prompt";
import { loadGoalClasses } from "@/lib/goals/query";
import type { GoalClass, GoalEngine, GoalPlannerErrorCode, GoalPlannerSuccess } from "@/lib/goals/types";
import { buildPlanView } from "@/lib/goals/view";
import { stripNul } from "@/lib/text/sanitize";

/** An expected failure with a message that is safe to show the student. */
export class GoalPlannerError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: GoalPlannerErrorCode
  ) {
    super(message);
    this.name = "GoalPlannerError";
  }
}

export const UNCLEAR_GOAL_MESSAGE =
  "Tell me the grade you're aiming for, like \"I need a B+\", \"at least 85%\", or \"just pass\".";
export const NEEDS_CLASS_MESSAGE = "Which class is this goal for? Pick a class and plan it again.";

/** Which engine reads goals right now, for the UI label (no secrets). */
export function goalEngineInfo(): { engine: GoalEngine; model: string | null } {
  return openAiConfigured() ? { engine: "openai", model: modelFor("text") } : { engine: "demo", model: null };
}

type Extraction = {
  classId: string | null;
  target: ParsedTarget | null;
  /** A tip that passed the checks, or null to use the template. */
  tip: string | null;
  clarifyingQuestion: string | null;
};

/**
 * gpt-4o-mini (modelFor("text")) reads the goal against the student's class
 * list. Its output is only an extraction: the class id is checked against the
 * student's own classes and the target is re-derived with the planner's scale
 * by the caller. OpenAI failures become a safe 502 GoalPlannerError.
 */
async function extractWithOpenAI(goal: string, classes: GoalClass[]): Promise<Extraction> {
  let completion;
  try {
    completion = await getOpenAI().chat.completions.parse(
      {
        model: modelFor("text"),
        temperature: 0.2,
        max_completion_tokens: 400,
        messages: [
          { role: "system", content: GOAL_SYSTEM_PROMPT },
          { role: "user", content: buildGoalUserPrompt(goal, classes) },
        ],
        response_format: zodResponseFormat(GoalExtractionSchema, "goal_extraction"),
      },
      openAiRequestOptions("text")
    );
  } catch (error) {
    // Logs the error class and status only; never the key or the goal text.
    throw new GoalPlannerError(describeOpenAiError(error, "Goal planner"), 502);
  }

  const message = completion.choices[0]?.message;
  if (message?.refusal) throw new GoalPlannerError(UNCLEAR_GOAL_MESSAGE, 400, "UNCLEAR_GOAL");
  const parsed = message?.parsed;
  if (!parsed) throw new GoalPlannerError("The planner couldn't read that goal. Try again.", 502);

  const question = cleanModelText(parsed.clarifying_question, MAX_QUESTION_CHARS);
  return {
    classId: parsed.class_id,
    target: resolveModelTarget(parsed),
    tip: acceptCoachingTip(parsed.coaching_tip),
    clarifyingQuestion: question || null,
  };
}

function extractWithDemo(goal: string, classes: GoalClass[]): Extraction {
  const parsed = parseGoal(goal, classes);
  return {
    classId: parsed?.classId ?? null,
    target: parsed ? { targetPercent: parsed.targetPercent, targetLabel: parsed.targetLabel } : null,
    tip: null,
    clarifyingQuestion: null,
  };
}

/** Plain percents at or below this are a GPA misread ("I need a 4.0"), never a real target. */
const GPA_LIKE_PERCENT = 4;

/** A percent target that only exists because the goal named a GPA. */
function isGpaMisread(target: ParsedTarget, goal: string): boolean {
  const isPercent = !isLetterTarget(target.targetLabel) && target.targetLabel !== PASS_LABEL;
  return isPercent && target.targetPercent <= GPA_LIKE_PERCENT && mentionsGpa(goal);
}

/**
 * Plan a grade goal for the signed-in student.
 *
 * 1. Load ONLY this student's classes and their teacher-approved grades.
 * 2. Read the goal (gpt-4o-mini, or the demo parser without a key).
 * 3. In code: keep the class only if it is one of the student's classes
 *    (else the class picked in the form, else ask), convert the target with
 *    the planner's scale, and compute the plan.
 * 4. Save it as the student's goal for that class and award GOAL_SET XP
 *    (once per day). XP never touches grades.
 */
export async function planStudentGoal(input: {
  studentId: string;
  goal: string;
  classId: string | null;
  now?: Date;
  /** The viewer's time zone, for which work counts as overdue in the plan. */
  timeZone?: string;
}): Promise<GoalPlannerSuccess> {
  const now = input.now ?? new Date();
  // Stored as the goal's rawText: drop NUL, which Postgres can't store.
  const goal = stripNul(input.goal).trim();
  if (!goal) throw new GoalPlannerError("Type your goal first.", 400);
  const classes = await loadGoalClasses(input.studentId, now, input.timeZone);
  if (classes.length === 0) {
    throw new GoalPlannerError("You're not enrolled in any classes yet.", 400, "NO_CLASSES");
  }
  if (input.classId && !classes.some((klass) => klass.id === input.classId)) {
    throw new GoalPlannerError("Class not found.", 404);
  }

  const engine = goalEngineInfo();
  const extraction =
    engine.engine === "openai" ? await extractWithOpenAI(goal, classes) : extractWithDemo(goal, classes);

  if (!extraction.target || isGpaMisread(extraction.target, goal)) {
    const message = mentionsGpa(goal) ? GPA_GOAL_MESSAGE : (extraction.clarifyingQuestion ?? UNCLEAR_GOAL_MESSAGE);
    throw new GoalPlannerError(message, 400, "UNCLEAR_GOAL");
  }

  const mentioned = classes.find((klass) => klass.id === extraction.classId);
  const picked = classes.find((klass) => klass.id === input.classId);
  const goalClass = mentioned ?? picked ?? (classes.length === 1 ? classes[0] : undefined);
  if (!goalClass) throw new GoalPlannerError(NEEDS_CLASS_MESSAGE, 400, "NEEDS_CLASS");

  const target = { percent: extraction.target.targetPercent, label: extraction.target.targetLabel };
  const plan = planGoal({ targetPercent: target.percent, completed: goalClass.completed, remaining: goalClass.remaining });
  const tipSource = extraction.tip ? "model" : "template";
  const coachingTip = extraction.tip ?? demoCoachingTip(goalClass.weakest, plan.status);

  // GOAL_SET XP is once per day. Checked before the transaction (a plain
  // read, see award.ts); the award's key stops a concurrent second copy.
  const goalXp: AwardInput = { kind: "GOAL_SET", xp: XP_RULES.GOAL_SET, refId: goalClass.id };
  const pendingXp = await unearnedAwards({ studentId: input.studentId, awards: [goalXp], now });

  const { saved, xpAwarded } = await transaction(async (tx) => {
    const saved = await tx.studentGoal.upsert({
      where: { studentId_classId: { studentId: input.studentId, classId: goalClass.id } },
      create: {
        studentId: input.studentId,
        classId: goalClass.id,
        rawText: goal,
        targetPercent: plan.targetPercent,
        targetLabel: target.label,
      },
      update: { rawText: goal, targetPercent: plan.targetPercent, targetLabel: target.label },
      select: { updatedAt: true },
    });
    const awarded = await insertAwards(tx, { studentId: input.studentId, awards: pendingXp, now });
    return { saved, xpAwarded: awarded.reduce((sum, award) => sum + award.xp, 0) };
  });

  return {
    ok: true,
    engine: engine.engine,
    model: engine.model,
    xpAwarded,
    plan: buildPlanView({
      goalClass,
      goalText: goal,
      target,
      plan,
      coachingTip,
      tipSource,
      clarifyingQuestion: null,
      savedAt: saved.updatedAt,
    }),
  };
}
