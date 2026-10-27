import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getOwnedAssignment, getOwnedSubmission } from "@/lib/access";
import { AuthError, requireTeacher } from "@/lib/auth/session";
import { parseGraderKind } from "@/lib/constants";
import { db, transaction } from "@/lib/db";
import { insertAwards } from "@/lib/gamification/award";
import { xpForPublishedGrade } from "@/lib/gamification/rules";
import { publishApprovedGrade } from "@/lib/grades/publish";
import { parsePayload, parseReturnNote, ReviewError } from "@/lib/grades/review-input";
import { toReviewItem } from "@/lib/review/map";
import { recheckFor, summarizeOverrides, type ApprovedScoreRow, type OverrideHistory } from "@/lib/review/recheck";
import type { ReviewItem, ReviewPayload } from "@/lib/review/types";
import { idSchema } from "@/lib/validation/id";

export { ReviewError } from "@/lib/grades/review-input";

/**
 * Teacher review logic: draft edits, approve + publish, and send back.
 *
 * Every entry point re-checks the teacher role and class ownership on the
 * server, validates its input, and only acts while the submission is still
 * NEEDS_REVIEW. Publishing itself is delegated to publishApprovedGrade(),
 * which re-checks the approval inside the same transaction.
 */

function parseSubmissionId(value: unknown): string {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) throw new AuthError("Submission not found.", 404);
  return parsed.data;
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

  const items = rows.map(toReviewItem);
  const history = await getOverrideHistory(teacherId, [...new Set(items.map((item) => item.assignment.id))]);
  return items.map((item) => ({ ...item, recheck: recheckFor(item, history) }));
}

/**
 * How often this teacher changed each grader's score on each criterion, over
 * the papers they already approved in these assignments: the stored AI score
 * against the stored final score. Read-only, and only from approved papers,
 * which are the teacher's own decisions. A failure here only drops the
 * "often changed" reasons; the queue still loads.
 */
async function getOverrideHistory(teacherId: string, assignmentIds: string[]): Promise<OverrideHistory> {
  if (assignmentIds.length === 0) return {};
  try {
    const scores = await db.criterionScore.findMany({
      where: {
        aiScore: { not: null },
        finalScore: { not: null },
        submission: {
          status: "PUBLISHED",
          assignmentId: { in: assignmentIds },
          assignment: { class: { teacherId } },
          aiGrade: { isNot: null },
        },
      },
      select: {
        criterionId: true,
        aiScore: true,
        finalScore: true,
        submission: { select: { assignmentId: true, aiGrade: { select: { grader: true } } } },
      },
      take: 5000,
    });
    const rows: ApprovedScoreRow[] = scores.flatMap((score) =>
      score.aiScore === null || score.finalScore === null || !score.submission.aiGrade
        ? []
        : [
            {
              assignmentId: score.submission.assignmentId,
              grader: parseGraderKind(score.submission.aiGrade.grader),
              criterionId: score.criterionId,
              aiScore: score.aiScore,
              finalScore: score.finalScore,
            },
          ]
    );
    return summarizeOverrides(rows);
  } catch (error) {
    console.error("[markwise] Could not read approved scores for the recheck reasons", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return {};
  }
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
    // transaction, so XP exists exactly when the grade was published. A
    // single keyed insert (once per submission, see award.ts): no predicate
    // read that could conflict with other students' XP.
    await insertAwards(tx, {
      studentId: submission.student.id,
      awards: [{ kind: "GRADE_PUBLISHED", xp: xpForPublishedGrade(result.totalScore, result.maxScore), refId: id }],
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
  const returnNote = parseReturnNote(note);
  const submission = await getReviewableSubmission(teacher.id, id);

  const updated = await db.submission.updateMany({
    where: { id, status: "NEEDS_REVIEW", assignment: { class: { teacherId: teacher.id } } },
    data: { status: "RETURNED", returnNote, returnedAt: new Date() },
  });
  if (updated.count !== 1) throw new ReviewError(statusMessage("UNKNOWN"));

  return { studentId: submission.student.id, studentName: submission.student.name };
}
