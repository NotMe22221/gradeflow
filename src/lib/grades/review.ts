import "server-only";

import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { getOwnedAssignment, getOwnedSubmission } from "@/lib/access";
import { AuthError, requireTeacher } from "@/lib/auth/session";
import { db, transaction } from "@/lib/db";
import { awardXp } from "@/lib/gamification/award";
import { xpForPublishedGrade } from "@/lib/gamification/rules";
import { publishApprovedGrade } from "@/lib/grades/publish";
import { toReviewItem } from "@/lib/review/map";
import { MAX_COMMENT_CHARS, MAX_FEEDBACK_CHARS, MAX_RETURN_NOTE_CHARS } from "@/lib/review/model";
import { isOnScoreStep } from "@/lib/review/scores";
import type { ReviewItem, ReviewPayload } from "@/lib/review/types";
import { idSchema } from "@/lib/validation/id";

/**
 * Teacher review logic: draft edits, approve + publish, and send back.
 *
 * Every entry point re-checks the teacher role and class ownership on the
 * server, validates its input, and only acts while the submission is still
 * NEEDS_REVIEW. Publishing itself is delegated to publishApprovedGrade(),
 * which re-checks the approval inside the same transaction.
 */

/** An expected, teacher-facing failure (bad input or a stale review). */
export class ReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewError";
  }
}

const HALF_POINTS_MESSAGE = "Scores must be whole or half points, like 7 or 7.5.";

const payloadSchema = z.object({
  scores: z
    .array(
      z.object({
        criterionId: z.string().min(1).max(64),
        // Half-point steps keep every published score exactly what the
        // teacher saw (the app shows one decimal, the CSV keeps two).
        score: z.number().refine(isOnScoreStep, HALF_POINTS_MESSAGE).nullable(),
        comment: z.string().max(MAX_COMMENT_CHARS),
      })
    )
    .max(100),
  feedback: z.string().max(MAX_FEEDBACK_CHARS),
});

const noteSchema = z
  .string()
  .trim()
  .min(1, "Add a note so the student knows what to revise.")
  .max(MAX_RETURN_NOTE_CHARS, `Keep the note under ${MAX_RETURN_NOTE_CHARS.toLocaleString()} characters.`);

function parseSubmissionId(value: unknown): string {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) throw new AuthError("Submission not found.", 404);
  return parsed.data;
}

function parsePayload(value: unknown): ReviewPayload {
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

function statusMessage(status: string): string {
  switch (status) {
    case "PUBLISHED":
    case "APPROVED":
      return "This grade is already published.";
    case "RETURNED":
      return "This paper was sent back to the student.";
    case "GRADING":
      return "The AI is re-grading this paper. Try again in a moment.";
    default:
      return "This paper is no longer waiting for review.";
  }
}

async function getReviewableSubmission(teacherId: string, submissionId: string) {
  const submission = await getOwnedSubmission(teacherId, submissionId);
  if (submission.status !== "NEEDS_REVIEW") throw new ReviewError(statusMessage(submission.status));
  return submission;
}

type RubricCriterion = { id: string; title: string; maxPoints: number };

/**
 * Check every score against this submission's own rubric. The client's
 * criterion ids and numbers are never trusted.
 */
function validateScores(
  scores: ReviewPayload["scores"],
  criteria: RubricCriterion[],
  { requireAll }: { requireAll: boolean }
) {
  const byId = new Map(criteria.map((criterion) => [criterion.id, criterion]));
  const seen = new Map<string, number | null>();

  for (const entry of scores) {
    const criterion = byId.get(entry.criterionId);
    if (!criterion) {
      throw new ReviewError("A score does not match this rubric. Reload the page and try again.");
    }
    if (seen.has(criterion.id)) throw new ReviewError("Each criterion can only be scored once.");
    if (
      entry.score !== null &&
      (!Number.isFinite(entry.score) || entry.score < 0 || entry.score > criterion.maxPoints)
    ) {
      throw new ReviewError(`"${criterion.title}" needs a score from 0 to ${criterion.maxPoints}.`);
    }
    seen.set(criterion.id, entry.score);
  }

  if (requireAll) {
    if (criteria.length === 0) throw new ReviewError("This rubric has no criteria to score.");
    for (const criterion of criteria) {
      if (seen.get(criterion.id) == null) {
        throw new ReviewError(`Score "${criterion.title}" before publishing.`);
      }
    }
  }
}

async function writeFinalValues(
  tx: Prisma.TransactionClient,
  submissionId: string,
  scores: ReviewPayload["scores"]
) {
  for (const entry of scores) {
    await tx.criterionScore.upsert({
      where: { submissionId_criterionId: { submissionId, criterionId: entry.criterionId } },
      create: {
        submissionId,
        criterionId: entry.criterionId,
        finalScore: entry.score,
        finalComment: entry.comment,
      },
      update: { finalScore: entry.score, finalComment: entry.comment },
    });
  }
}

function draftFeedback(feedback: string): string | null {
  return feedback.trim() ? feedback : null;
}

// --- Queue ------------------------------------------------------------------

/**
 * Papers waiting in this teacher's review queue, oldest first. Scanned tests
 * carry their page photo ids (never the bytes); the photos are served by
 * GET /api/submissions/[submissionId]/images/[imageId].
 */
export async function getReviewQueue(teacherId: string): Promise<ReviewItem[]> {
  const rows = await db.submission.findMany({
    where: { status: "NEEDS_REVIEW", assignment: { class: { teacherId } } },
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    take: 200,
    select: {
      id: true,
      content: true,
      fileName: true,
      source: true,
      submittedAt: true,
      returnNote: true,
      returnedAt: true,
      teacherFeedback: true,
      student: { select: { id: true, name: true } },
      assignment: {
        select: {
          id: true,
          title: true,
          kind: true,
          class: { select: { name: true } },
          criteria: {
            orderBy: { position: "asc" },
            select: { id: true, title: true, description: true, maxPoints: true, position: true },
          },
        },
      },
      aiGrade: {
        select: { grader: true, model: true, confidence: true, overallComment: true, flags: true },
      },
      scores: {
        select: {
          criterionId: true,
          aiScore: true,
          aiJustification: true,
          aiEvidence: true,
          evidenceFound: true,
          finalScore: true,
          finalComment: true,
        },
      },
      images: { orderBy: { position: "asc" }, select: { id: true, position: true } },
    },
  });

  return rows.map(toReviewItem);
}

/** Title of an assignment this teacher owns, for the filter's empty state. */
export async function getOwnedAssignmentTitle(
  teacherId: string,
  assignmentId: string
): Promise<string | null> {
  try {
    const assignment = await getOwnedAssignment(teacherId, assignmentId);
    return assignment.title;
  } catch (error) {
    if (error instanceof AuthError) return null;
    throw error;
  }
}

// --- Mutations ----------------------------------------------------------------

/** Save the teacher's working scores and comments. Never publishes. */
export async function saveReviewDraft(submissionId: unknown, payload: unknown) {
  const teacher = await requireTeacher();
  const id = parseSubmissionId(submissionId);
  const input = parsePayload(payload);
  const submission = await getReviewableSubmission(teacher.id, id);
  validateScores(input.scores, submission.assignment.criteria, { requireAll: false });

  await transaction(async (tx) => {
    // Re-check the status inside the transaction so a draft can never land
    // on a paper that was approved or sent back a moment ago.
    const claimed = await tx.submission.updateMany({
      where: { id, status: "NEEDS_REVIEW", assignment: { class: { teacherId: teacher.id } } },
      data: { teacherFeedback: draftFeedback(input.feedback) },
    });
    if (claimed.count !== 1) throw new ReviewError(statusMessage("UNKNOWN"));
    await writeFinalValues(tx, id, input.scores);
  });

  return { savedAt: new Date() };
}

/**
 * Write the final values, record the teacher's approval, and publish, all in
 * one transaction. If any step fails, nothing is saved or published.
 */
export async function approveAndPublish(submissionId: unknown, payload: unknown) {
  const teacher = await requireTeacher();
  const id = parseSubmissionId(submissionId);
  const input = parsePayload(payload);
  const submission = await getReviewableSubmission(teacher.id, id);
  validateScores(input.scores, submission.assignment.criteria, { requireAll: true });

  const now = new Date();
  const published = await transaction(async (tx) => {
    await writeFinalValues(tx, id, input.scores);

    // Claim the approval. Only one approval can ever win for a submission.
    const claimed = await tx.submission.updateMany({
      where: { id, status: "NEEDS_REVIEW", assignment: { class: { teacherId: teacher.id } } },
      data: {
        status: "APPROVED",
        approvedAt: now,
        approvedById: teacher.id,
        teacherFeedback: draftFeedback(input.feedback),
      },
    });
    if (claimed.count !== 1) {
      throw new ReviewError("This paper was already handled, so nothing was published.");
    }

    const result = await publishApprovedGrade(tx, id, teacher.id);

    // Engagement only: XP never touches the grade itself. Inside the same
    // transaction, so XP exists exactly when the grade was published.
    await awardXp(tx, {
      studentId: submission.student.id,
      kind: "GRADE_PUBLISHED",
      xp: xpForPublishedGrade(result.totalScore, result.maxScore),
      refId: id,
      now,
    });

    return result;
  });

  return {
    totalScore: published.totalScore,
    maxScore: published.maxScore,
    studentId: submission.student.id,
    studentName: submission.student.name,
    assignmentId: submission.assignmentId,
  };
}

/** Return the paper to the student with a note. Nothing is published. */
export async function sendBackToStudent(submissionId: unknown, note: unknown) {
  const teacher = await requireTeacher();
  const id = parseSubmissionId(submissionId);
  const parsedNote = noteSchema.safeParse(typeof note === "string" ? note : "");
  if (!parsedNote.success) {
    throw new ReviewError(parsedNote.error.issues[0]?.message ?? "Add a note for the student.");
  }
  const submission = await getReviewableSubmission(teacher.id, id);

  const updated = await db.submission.updateMany({
    where: { id, status: "NEEDS_REVIEW", assignment: { class: { teacherId: teacher.id } } },
    data: { status: "RETURNED", returnNote: parsedNote.data, returnedAt: new Date() },
  });
  if (updated.count !== 1) throw new ReviewError(statusMessage("UNKNOWN"));

  return { studentId: submission.student.id, studentName: submission.student.name };
}
