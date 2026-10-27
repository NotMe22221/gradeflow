// Class and roster validation shared by the dialogs (client) and the server
// actions. Pure: safe for client components, server code, and unit tests.

import { z } from "zod";

import { stripNul } from "@/lib/text/sanitize";
import type { FieldErrors } from "@/lib/validation/form";

export const NAME_MAX = 40;

/**
 * Collapse runs of whitespace so "Ava   Quillon" is stored as "Ava Quillon",
 * and drop NUL characters, which Postgres can't store.
 */
function tidy(value: string): string {
  return stripNul(value).replace(/\s+/g, " ").trim();
}

const optionalText = (max: number, message: string) =>
  z
    .string()
    .transform(tidy)
    .pipe(z.string().max(max, message));

export const classInputSchema = z.object({
  name: z
    .string()
    .transform(tidy)
    .pipe(z.string().min(1, "Give the class a name.").max(80, "Keep the class name under 80 characters.")),
  section: optionalText(40, "Keep the section under 40 characters."),
  subject: optionalText(60, "Keep the subject under 60 characters."),
});

// Letters (any script, with combining accents), spaces, hyphens, and
// apostrophes. Must start with a letter.
const PERSON_NAME = /^\p{L}[\p{L}\p{M} '’-]*$/u;
const NAME_RULE_MESSAGE = "Use letters, spaces, hyphens, or apostrophes.";

const personName = (label: string) =>
  z
    .string()
    .transform(tidy)
    .pipe(
      z
        .string()
        .min(1, `Enter a ${label}.`)
        .max(NAME_MAX, `Keep the ${label} to ${NAME_MAX} characters or fewer.`)
        .regex(PERSON_NAME, NAME_RULE_MESSAGE)
    );

export const studentInputSchema = z.object({
  firstName: personName("first name"),
  lastName: personName("last name"),
});

export type FormFailure = { ok: false; error: string; fieldErrors?: FieldErrors };

export type AddStudentResult = { ok: true; student: { name: string; email: string } } | FormFailure;
