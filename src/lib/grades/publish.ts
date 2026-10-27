import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { serializeBreakdown, type BreakdownItem } from "@/lib/grades/breakdown";
import { isOnScoreStep } from "@/lib/review/scores";

/*
 * THE APPROVAL GATE.
 *
 * publishApprovedGrade() is the only code in Markwise that writes a
 * PublishedGrade row, and PublishedGrade is the only table the gradebook,
 * CSV export, dashboard stats, and student view read scores from. The AI
 * grader never imports this module.
 *
 * It runs inside the caller's transaction and trusts nothing the caller
 * says: it re-reads the acting user, the submission, its approval state, and
 * every final score from the database, and throws PublishError (rolling the
 * whole transaction back) if anything does not check out.
 */

export class PublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublishError";
  }
}

export type PublishResult = {
  publishedGradeId: string;
  totalScore: number;
  maxScore: number;
};

function roundPoints(value: number): number {
  return Math.round(value * 100) / 100;
}

/** In range and on the half-point step the review screen enforces. */
function isPublishableScore(value: number | null | undefined, maxPoints: number): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= maxPoints &&
    isOnScoreStep(value)
  );
}

export async function publishApprovedGrade(
  tx: Prisma.TransactionClient,
  submissionId: string,
  teacherId: string
): Promise<PublishResult> {
  const teacher = await tx.user.findUnique({
    where: { id: teacherId },
    select: { id: true, role: true },
  });
  if (!teacher || teacher.role !== "TEACHER") {
    throw new PublishError("Only a teacher can publish a grade.");
  }

  const submission = await tx.submission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: {
        include: {
          class: { select: { teacherId: true } },
          criteria: { orderBy: { position: "asc" } },
        },
      },
      scores: true,
      publishedGrade: { select: { id: true } },
    },
  });
  if (!submission) throw new PublishError("Submission not found.");
  if (submission.assignment.class.teacherId !== teacherId) {
    throw new PublishError("Only the teacher of this class can publish this grade.");
  }
  if (
    submission.status !== "APPROVED" ||
    submission.approvedById !== teacherId ||
    !submission.approvedAt
  ) {
    throw new PublishError("This grade has not been approved by you, so it was not published.");
  }
  if (submission.publishedGrade) throw new PublishError("This grade is already published.");

  const criteria = submission.assignment.criteria;
  if (criteria.length === 0) throw new PublishError("This assignment has no rubric criteria to publish.");

  const scoreByCriterion = new Map(submission.scores.map((score) => [score.criterionId, score]));

  const breakdown: BreakdownItem[] = criteria.map((criterion) => {
    const row = scoreByCriterion.get(criterion.id);
    if (!row || !isPublishableScore(row.finalScore, criterion.maxPoints)) {
      throw new PublishError(
        `"${criterion.title}" needs a score from 0 to ${criterion.maxPoints}, in whole or half points, before publishing.`
      );
    }
    return {
      criterionId: criterion.id,
      title: criterion.title,
      maxPoints: criterion.maxPoints,
      score: row.finalScore,
      comment: (row.finalComment ?? "").trim(),
    };
  });

  const totalScore = roundPoints(breakdown.reduce((sum, item) => sum + item.score, 0));
  const maxScore = criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);

  const aiScores = criteria.map((criterion) => scoreByCriterion.get(criterion.id)?.aiScore ?? null);
  const aiTotalScore = aiScores.every((score) => typeof score === "number" && Number.isFinite(score))
    ? roundPoints(aiScores.reduce<number>((sum, score) => sum + (score ?? 0), 0))
    : null;

  const feedback = submission.teacherFeedback?.trim() || null;

  const published = await tx.publishedGrade.create({
    data: {
      submissionId: submission.id,
      totalScore,
      maxScore,
      breakdown: serializeBreakdown(breakdown),
      feedback,
      aiTotalScore,
      approvedById: teacherId,
      approvedAt: submission.approvedAt,
    },
    select: { id: true },
  });

  const moved = await tx.submission.updateMany({
    where: { id: submission.id, status: "APPROVED", approvedById: teacherId },
    data: { status: "PUBLISHED" },
  });
  if (moved.count !== 1) {
    throw new PublishError("This paper changed while publishing. Nothing was published.");
  }

  return { publishedGradeId: published.id, totalScore, maxScore };
}
