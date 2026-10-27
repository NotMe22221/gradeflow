// Parsing of the teacher's review input (draft scores, comments, the overall
// note, and the send-back note) for src/lib/grades/review.ts. Pure: no
// database, safe for unit tests. The client's values are never trusted:
// review.ts re-checks every score against the submission's own rubric.

import { z } from "zod";

import { MAX_COMMENT_CHARS, MAX_FEEDBACK_CHARS, MAX_RETURN_NOTE_CHARS } from "@/lib/review/model";
import { isOnScoreStep } from "@/lib/review/scores";
import type { ReviewPayload } from "@/lib/review/types";
import { stripNul } from "@/lib/text/sanitize";

/** An expected, teacher-facing failure (bad input or a stale review). */
export class ReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewError";
  }
}

export const HALF_POINTS_MESSAGE = "Scores must be whole or half points, like 7 or 7.5.";

// Teacher text drops NUL characters before the length checks: they are
// invisible in the textarea, and Postgres can't store them (see
// src/lib/text/sanitize.ts), so one pasted from a PDF would otherwise fail
// every save and publish. Issues keep their paths through the pipe, so
// parsePayload's messages still match.
const payloadSchema = z.object({
  scores: z
    .array(
      z.object({
        criterionId: z.string().min(1).max(64),
        // Half-point steps keep every published score exactly what the
        // teacher saw (the app shows one decimal, the CSV keeps two).
        score: z.number().refine(isOnScoreStep, HALF_POINTS_MESSAGE).nullable(),
        comment: z.string().transform(stripNul).pipe(z.string().max(MAX_COMMENT_CHARS)),
      })
    )
    .max(100),
  feedback: z.string().transform(stripNul).pipe(z.string().max(MAX_FEEDBACK_CHARS)),
});

const noteSchema = z
  .string()
  .transform(stripNul)
  .pipe(
    z
      .string()
      .trim()
      .min(1, "Add a note so the student knows what to revise.")
      .max(MAX_RETURN_NOTE_CHARS, `Keep the note under ${MAX_RETURN_NOTE_CHARS.toLocaleString()} characters.`)
  );

/** The review payload, or a ReviewError with a message for the teacher. */
export function parsePayload(value: unknown): ReviewPayload {
  const parsed = payloadSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  const issue = parsed.error.issues[0];
  const path = issue?.path ?? [];
  if (path[0] === "feedback") {
    throw new ReviewError(
      `The overall note is limited to ${MAX_FEEDBACK_CHARS.toLocaleString()} characters.`
    );
  }
  if (path.includes("comment")) {
    throw new ReviewError(
      `Feedback for each criterion is limited to ${MAX_COMMENT_CHARS.toLocaleString()} characters.`
    );
  }
  if (path.includes("score")) {
    throw new ReviewError(issue?.code === "custom" ? HALF_POINTS_MESSAGE : "Scores must be numbers.");
  }
  throw new ReviewError("Those review changes could not be read. Reload the page and try again.");
}

/** The trimmed send-back note, or a ReviewError with a message for the teacher. */
export function parseReturnNote(value: unknown): string {
  const parsed = noteSchema.safeParse(typeof value === "string" ? value : "");
  if (!parsed.success) {
    throw new ReviewError(parsed.error.issues[0]?.message ?? "Add a note for the student.");
  }
  return parsed.data;
}
