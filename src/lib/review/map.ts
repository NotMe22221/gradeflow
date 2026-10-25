// Maps a review-queue database row to the serializable ReviewItem the review
// workspace renders. Pure (no DB, no React): the server loader in
// src/lib/grades/review.ts uses it, and so do the unit tests.

import { isConfidence, parseAssignmentKind, parseGraderKind } from "@/lib/constants";
import { wordCount } from "@/lib/format";
import { parseFlags } from "@/lib/grading/flags";
import { parseSubmissionSource, toReviewImages } from "@/lib/review/media";
import { previousReturn } from "@/lib/review/model";
import type { ReviewItem } from "@/lib/review/types";

/** The fields getReviewQueue() selects for each submission. */
export type ReviewQueueRow = {
  id: string;
  content: string;
  fileName: string | null;
  source: string;
  submittedAt: Date;
  returnNote: string | null;
  returnedAt: Date | null;
  teacherFeedback: string | null;
  student: { id: string; name: string };
  assignment: {
    id: string;
    title: string;
    kind: string;
    class: { name: string };
    criteria: { id: string; title: string; description: string; maxPoints: number; position: number }[];
  };
  aiGrade: {
    grader: string;
    model: string | null;
    confidence: string;
    overallComment: string | null;
    flags: string;
  } | null;
  scores: {
    criterionId: string;
    aiScore: number | null;
    aiJustification: string | null;
    aiEvidence: string | null;
    evidenceFound: boolean;
    finalScore: number | null;
    finalComment: string | null;
  }[];
  /** Page photos: ids and order only, never the bytes. */
  images: { id: string; position: number }[];
};

export function toReviewItem(row: ReviewQueueRow): ReviewItem {
  const scoreByCriterion = new Map(row.scores.map((score) => [score.criterionId, score]));
  return {
    id: row.id,
    content: row.content,
    fileName: row.fileName,
    source: parseSubmissionSource(row.source),
    images: toReviewImages(row.images),
    submittedAt: row.submittedAt.toISOString(),
    wordCount: wordCount(row.content),
    student: { id: row.student.id, name: row.student.name },
    assignment: {
      id: row.assignment.id,
      title: row.assignment.title,
      className: row.assignment.class.name,
      kind: parseAssignmentKind(row.assignment.kind),
    },
    ai: row.aiGrade
      ? {
          // Unknown values are labelled as the demo grader, so placeholder
          // output is never presented as real AI.
          grader: parseGraderKind(row.aiGrade.grader),
          model: row.aiGrade.model,
          confidence: isConfidence(row.aiGrade.confidence) ? row.aiGrade.confidence : "low",
          overallComment: row.aiGrade.overallComment,
          flags: parseFlags(row.aiGrade.flags),
        }
      : null,
    criteria: row.assignment.criteria.map((criterion) => {
      const score = scoreByCriterion.get(criterion.id);
      return {
        id: criterion.id,
        title: criterion.title,
        description: criterion.description,
        maxPoints: criterion.maxPoints,
        position: criterion.position,
        aiScore: score?.aiScore ?? null,
        aiJustification: score?.aiJustification ?? null,
        aiEvidence: score?.aiEvidence ?? null,
        evidenceFound: score?.evidenceFound ?? false,
        finalScore: score?.finalScore ?? null,
        finalComment: score?.finalComment ?? null,
      };
    }),
    teacherFeedback: row.teacherFeedback,
    previousReturn: previousReturn(row),
  };
}
