// Assignment + rubric validation shared by the rubric builder (client) and the
// createAssignment server action, so both enforce exactly the same rules.
// Pure: safe for client components, server code, and unit tests.
//
// Two kinds of assignment share one shape:
// - ESSAY: typed papers graded against rubric criteria.
// - TEST:  handwritten tests. Each criterion is one question, and its
//          description is the answer key (what earns full credit).

import { z } from "zod";

import { parseAssignmentKind, type AssignmentKind } from "@/lib/constants";
import { stripNul } from "@/lib/text/sanitize";
import type { FieldErrors } from "@/lib/validation/form";

export type RubricLimits = {
  minCriteria: number;
  maxCriteria: number;
  minPoints: number;
  maxPoints: number;
  titleMax: number;
  instructionsMax: number;
  criterionTitleMax: number;
  criterionDescriptionMax: number;
};

/** Limits for an essay rubric. */
export const RUBRIC_LIMITS = {
  minCriteria: 1,
  maxCriteria: 10,
  minPoints: 1,
  maxPoints: 100,
  titleMax: 120,
  instructionsMax: 6000,
  criterionTitleMax: 80,
  criterionDescriptionMax: 600,
} as const satisfies RubricLimits;

/**
 * A handwritten test has more, shorter items than an essay rubric. These
 * match what the answer-key import can return (src/lib/scan/answer-key.ts).
 */
export const TEST_LIMITS = {
  ...RUBRIC_LIMITS,
  maxCriteria: 20,
  criterionTitleMax: 120,
} as const satisfies RubricLimits;

export function rubricLimitsFor(kind: AssignmentKind): RubricLimits {
  return kind === "TEST" ? TEST_LIMITS : RUBRIC_LIMITS;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Parse an <input type="date"> value ("YYYY-MM-DD") into a real calendar date. */
export function parseDateOnly(value: string): Date | null {
  if (!DATE_ONLY.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 2000 || year > 2100) return null;
  // Noon UTC keeps the same calendar day in every time zone from UTC-11 to UTC+11.
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

/**
 * The kind an untrusted payload asks for. Same semantics as
 * parseAssignmentKind: anything other than "TEST" is an essay.
 */
export function kindOfInput(input: unknown): AssignmentKind {
  if (!input || typeof input !== "object" || !("kind" in input)) return "ESSAY";
  const { kind } = input as { kind: unknown };
  return parseAssignmentKind(typeof kind === "string" ? kind : null);
}

type Messages = {
  criterionTitle: string;
  criterionTitleTooLong: string;
  criterionDescription: string;
  criterionDescriptionTooLong: string;
  instructions: string;
  minCriteria: string;
  maxCriteria: string;
};

function messagesFor(kind: AssignmentKind, limits: RubricLimits): Messages {
  if (kind === "TEST") {
    return {
      criterionTitle: "Name this question.",
      criterionTitleTooLong: `Keep question labels under ${limits.criterionTitleMax} characters.`,
      criterionDescription: "Write the answer that earns full credit.",
      criterionDescriptionTooLong: `Keep the answer key under ${limits.criterionDescriptionMax} characters.`,
      instructions: "Add the directions printed on the test.",
      minCriteria: "Add at least one question.",
      maxCriteria: `Use ${limits.maxCriteria} questions or fewer.`,
    };
  }
  return {
    criterionTitle: "Give this criterion a title.",
    criterionTitleTooLong: `Keep criterion titles under ${limits.criterionTitleMax} characters.`,
    criterionDescription: "Describe what full credit looks like.",
    criterionDescriptionTooLong: `Keep this under ${limits.criterionDescriptionMax} characters.`,
    instructions: "Write the prompt students will respond to.",
    minCriteria: "Add at least one criterion.",
    maxCriteria: `Use ${limits.maxCriteria} criteria or fewer.`,
  };
}

/**
 * Required free text: NUL characters (which Postgres can't store) are dropped
 * first, then the trimmed text must be 1..max characters. Issues keep the
 * field's own path ("title", "criteria.2.description").
 */
function requiredText(max: number, emptyMessage: string, tooLongMessage: string) {
  return z.string().transform(stripNul).pipe(z.string().trim().min(1, emptyMessage).max(max, tooLongMessage));
}

function buildSchema(kind: AssignmentKind) {
  const limits = rubricLimitsFor(kind);
  const messages = messagesFor(kind, limits);
  const pointsMessage = `Use a whole number from ${limits.minPoints} to ${limits.maxPoints}.`;

  const criterion = z.object({
    title: requiredText(limits.criterionTitleMax, messages.criterionTitle, messages.criterionTitleTooLong),
    description: requiredText(
      limits.criterionDescriptionMax,
      messages.criterionDescription,
      messages.criterionDescriptionTooLong
    ),
    maxPoints: z
      .number({ error: pointsMessage })
      .int(pointsMessage)
      .min(limits.minPoints, pointsMessage)
      .max(limits.maxPoints, pointsMessage),
  });

  return z.object({
    title: requiredText(limits.titleMax, "Give the assignment a title.", `Keep the title under ${limits.titleMax} characters.`),
    instructions: requiredText(
      limits.instructionsMax,
      messages.instructions,
      `Keep this under ${limits.instructionsMax.toLocaleString("en-US")} characters.`
    ),
    dueDate: z
      .string()
      .trim()
      .refine((value) => value === "" || parseDateOnly(value) !== null, "Pick a valid date, or leave it empty."),
    criteria: z
      .array(criterion)
      .min(limits.minCriteria, messages.minCriteria)
      .max(limits.maxCriteria, messages.maxCriteria),
  });
}

/** One schema per assignment kind. Use parseAssignmentInput() to pick the right one. */
export const assignmentInputSchemas = {
  ESSAY: buildSchema("ESSAY"),
  TEST: buildSchema("TEST"),
} as const;

export type AssignmentInput = z.output<(typeof assignmentInputSchemas)[AssignmentKind]> & {
  kind: AssignmentKind;
};
export type CriterionInput = AssignmentInput["criteria"][number];

/**
 * Validate an assignment payload against the rules for the kind it asks for
 * (an unknown or missing kind is an essay). The parsed data carries the kind
 * that was validated, never the raw value the client sent.
 */
export function parseAssignmentInput(
  input: unknown
): { success: true; data: AssignmentInput } | { success: false; error: z.ZodError } {
  const kind = kindOfInput(input);
  const result = assignmentInputSchemas[kind].safeParse(input);
  return result.success ? { success: true, data: { ...result.data, kind } } : { success: false, error: result.error };
}

export type CreateAssignmentResult = { ok: false; error: string; fieldErrors?: FieldErrors };
