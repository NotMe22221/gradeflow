// Client-side draft state for the rubric builder. Pure helpers shared by
// RubricBuilder and its child components.

import { RUBRIC_LIMITS } from "@/lib/validation/assignment";
import type { FieldErrors } from "@/lib/validation/form";

/** A criterion as typed into the form; maxPoints stays a string until submit. */
export type CriterionDraft = { key: string; title: string; description: string; maxPoints: string };

export type CriterionField = "title" | "description" | "maxPoints";

export function parsePoints(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

/** The points value if it is valid, otherwise 0 (for running totals). */
export function validPoints(value: string): number {
  const points = parsePoints(value);
  return Number.isInteger(points) && points >= RUBRIC_LIMITS.minPoints && points <= RUBRIC_LIMITS.maxPoints
    ? points
    : 0;
}

/** DOM id of the error message for a field path ("criteria.2.title" -> "criteria-2-title-error"). */
export function errorId(key: string): string {
  return `${key.replaceAll(".", "-")}-error`;
}

/** aria-invalid / aria-describedby for a field path. */
export function fieldA11y(errors: FieldErrors, key: string) {
  return {
    "aria-invalid": errors[key] ? (true as const) : undefined,
    "aria-describedby": errors[key] ? errorId(key) : undefined,
  };
}
