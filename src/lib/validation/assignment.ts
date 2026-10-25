// Assignment + rubric validation shared by the rubric builder (client) and the
// createAssignment server action, so both enforce exactly the same rules.
// Pure: safe for client components, server code, and unit tests.

import { z } from "zod";

import type { FieldErrors } from "@/lib/validation/form";

export const RUBRIC_LIMITS = {
  minCriteria: 1,
  maxCriteria: 10,
  minPoints: 1,
  maxPoints: 100,
  titleMax: 120,
  instructionsMax: 6000,
  criterionTitleMax: 80,
  criterionDescriptionMax: 600,
} as const;

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

const pointsMessage = `Use a whole number from ${RUBRIC_LIMITS.minPoints} to ${RUBRIC_LIMITS.maxPoints}.`;

export const criterionInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give this criterion a title.")
    .max(RUBRIC_LIMITS.criterionTitleMax, `Keep criterion titles under ${RUBRIC_LIMITS.criterionTitleMax} characters.`),
  description: z
    .string()
    .trim()
    .min(1, "Describe what full credit looks like.")
    .max(
      RUBRIC_LIMITS.criterionDescriptionMax,
      `Keep this under ${RUBRIC_LIMITS.criterionDescriptionMax} characters.`
    ),
  maxPoints: z
    .number({ error: pointsMessage })
    .int(pointsMessage)
    .min(RUBRIC_LIMITS.minPoints, pointsMessage)
    .max(RUBRIC_LIMITS.maxPoints, pointsMessage),
});

export const assignmentInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the assignment a title.")
    .max(RUBRIC_LIMITS.titleMax, `Keep the title under ${RUBRIC_LIMITS.titleMax} characters.`),
  instructions: z
    .string()
    .trim()
    .min(1, "Write the prompt students will respond to.")
    .max(
      RUBRIC_LIMITS.instructionsMax,
      `Keep the prompt under ${RUBRIC_LIMITS.instructionsMax.toLocaleString("en-US")} characters.`
    ),
  dueDate: z
    .string()
    .trim()
    .refine((value) => value === "" || parseDateOnly(value) !== null, "Pick a valid date, or leave it empty."),
  criteria: z
    .array(criterionInputSchema)
    .min(RUBRIC_LIMITS.minCriteria, "Add at least one criterion.")
    .max(RUBRIC_LIMITS.maxCriteria, `Use ${RUBRIC_LIMITS.maxCriteria} criteria or fewer.`),
});

export type CreateAssignmentResult = { ok: false; error: string; fieldErrors?: FieldErrors };
