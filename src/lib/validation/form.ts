// Form error helpers shared by client forms and server actions. Pure: safe
// for client components, server code, and unit tests.

import type { z } from "zod";

/** Field errors keyed by path: "title", "criteria", "criteria.2.maxPoints". */
export type FieldErrors = Record<string, string>;

/** The first message per field path; issues without a path land on "form". */
export function fieldErrorsFromIssues(issues: readonly z.core.$ZodIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}
