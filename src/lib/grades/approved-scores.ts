import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { parseGraderKind } from "@/lib/constants";
import { db } from "@/lib/db";
import { summarizeAgreement, type AgreementScoreRow, type AiAgreement } from "@/lib/review/agreement";
import { toReviewItem } from "@/lib/review/map";
import {
  historyFromTotals,
  OVERRIDE_MIN_CHANGE,
  recheckFor,
  type OverrideHistory,
  type OverrideTotals,
} from "@/lib/review/recheck";
import type { ReviewItem } from "@/lib/review/types";

/*
 * Read-only views of the scores a teacher already approved, next to the AI's
 * stored draft scores: the override history behind To review's "worth
 * rechecking" reasons, the "AI vs your grades" card on the assignment page,
 * and the "worth rechecking" counts on Home and that card. Stored data only,
 * no AI call, and never the paper's text. Every query is scoped to the
 * teacher's own classes. Teacher surfaces only: students never see any of this.
 */

/** To review's page: the teacher's oldest 200 drafts. getReviewQueue and the counts here load the same page. */
export const REVIEW_QUEUE_LIMIT = 200;

/** The drafts To review shows, oldest first: spread into db.submission.findMany with a select. */
export function reviewQueuePage(teacherId: string) {
  return {
    where: { status: "NEEDS_REVIEW", assignment: { class: { teacherId } } },
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    take: REVIEW_QUEUE_LIMIT,
  } satisfies Prisma.SubmissionFindManyArgs;
}

// --- Override history ----------------------------------------------------------

/**
 * The approved scores behind the override history, added up per assignment,
 * grader and criterion in the database (the same counts summarizeOverrides
 * makes from rows): approved papers, papers changed by OVERRIDE_MIN_CHANGE or
 * more, and the sum of those changes. Only this teacher's classes, only
 * published papers with an AI draft, and only criterion scores where both the
 * AI's and the final score are finite numbers. With assignmentIds, only those
 * assignments; without, only assignments with a draft waiting in To review
 * (the only drafts recheckFor reads it for), so an autosave's refresh of To
 * review doesn't add up every score the teacher ever approved. Table and
 * column names are the Prisma model and field names (the schema maps none of
 * them).
 *
 * $queryRaw reads a Prisma.sql query's text and values, so it works whichever
 * bundle created `db` (see lib/db.ts).
 */
export function overrideTotalsQuery(teacherId: string, assignmentIds?: readonly string[]): Prisma.Sql {
  if (assignmentIds?.length === 0) throw new Error("overrideTotalsQuery needs at least one assignment id, or none at all.");
  const change = Prisma.sql`abs(cs."finalScore" - cs."aiScore")`;
  const changed = Prisma.sql`${change} >= ${OVERRIDE_MIN_CHANGE}::float8`;
  const inAssignments = assignmentIds
    ? Prisma.sql`AND s."assignmentId" IN (${Prisma.join([...assignmentIds])})`
    : Prisma.sql`AND s."assignmentId" IN (SELECT q."assignmentId" FROM "Submission" q WHERE q."status" = 'NEEDS_REVIEW')`;
  // abs(x) < 'Infinity' is false for NaN and ±Infinity (Postgres sorts NaN above every number).
  return Prisma.sql`
    SELECT s."assignmentId" AS "assignmentId",
           g."grader" AS "grader",
           cs."criterionId" AS "criterionId",
           COUNT(*)::int AS "papers",
           (COUNT(*) FILTER (WHERE ${changed}))::int AS "changed",
           COALESCE(SUM(${change}) FILTER (WHERE ${changed}), 0)::float8 AS "change"
    FROM "CriterionScore" cs
    JOIN "Submission" s ON s."id" = cs."submissionId"
    JOIN "AiGrade" g ON g."submissionId" = s."id"
    JOIN "Assignment" a ON a."id" = s."assignmentId"
    JOIN "Class" c ON c."id" = a."classId"
    WHERE c."teacherId" = ${teacherId}
      AND s."status" = 'PUBLISHED'
      AND cs."aiScore" IS NOT NULL
      AND cs."finalScore" IS NOT NULL
      AND abs(cs."aiScore") < 'Infinity'::float8
      AND abs(cs."finalScore") < 'Infinity'::float8
      ${inAssignments}
    GROUP BY s."assignmentId", g."grader", cs."criterionId"`;
}

/** A row of overrideTotalsQuery as the driver returns it (counts are cast to int, so plain numbers). */
export function toOverrideTotals(row: Record<string, unknown>): OverrideTotals {
  return {
    assignmentId: String(row.assignmentId),
    grader: String(row.grader),
    criterionId: String(row.criterionId),
    papers: Number(row.papers),
    changed: Number(row.changed),
    change: Number(row.change),
  };
}

/**
 * How often this teacher changed each grader's score on each criterion, over
 * the papers they already approved: the history recheckFor takes. One loader
 * for To review, Home's count and the assignment card. With assignmentIds,
 * only those assignments (an empty list loads nothing); without, every
 * assignment of the teacher's with a draft waiting in To review. Added up in
 * the database, so it costs one row per assignment, grader and criterion
 * however many papers were approved.
 * Throws on a database error; callers decide what a failure drops.
 */
export async function loadOverrideHistory(teacherId: string, assignmentIds?: readonly string[]): Promise<OverrideHistory> {
  if (assignmentIds?.length === 0) return {};
  const rows = await db.$queryRaw<Record<string, unknown>[]>(overrideTotalsQuery(teacherId, assignmentIds));
  return historyFromTotals(rows.map(toOverrideTotals));
}

// --- "AI vs your grades" ---------------------------------------------------------

/** A cap on one assignment's approved criterion scores (papers x criteria); a class never comes near it. */
const APPROVED_SCORE_LIMIT = 5000;

/**
 * Criterion scores of this teacher's approved (published) papers that had an
 * AI draft, on one assignment, in a stable order. aiScore is null where the
 * AI's score was discarded: the card counts those as "no usable score", so
 * they stay in. finalScore is the published score.
 */
async function approvedScoreRows(teacherId: string, assignmentId: string): Promise<AgreementScoreRow[]> {
  const scores = await db.criterionScore.findMany({
    where: {
      finalScore: { not: null },
      submission: {
        status: "PUBLISHED",
        assignmentId,
        assignment: { class: { teacherId } },
        aiGrade: { isNot: null },
      },
    },
    orderBy: [{ submissionId: "asc" }, { criterionId: "asc" }],
    select: {
      submissionId: true,
      criterionId: true,
      aiScore: true,
      finalScore: true,
      submission: { select: { aiGrade: { select: { grader: true } } } },
    },
    take: APPROVED_SCORE_LIMIT,
  });
  return scores.flatMap((score) =>
    score.finalScore === null || !score.submission.aiGrade
      ? []
      : [
          {
            submissionId: score.submissionId,
            grader: parseGraderKind(score.submission.aiGrade.grader),
            criterionId: score.criterionId,
            aiScore: score.aiScore,
            finalScore: score.finalScore,
          },
        ]
  );
}

// --- Drafts in To review -----------------------------------------------------------

/** Only what recheckFor reads: the AI record, its flags and confidence, and the criterion scores. */
const DRAFT_SELECT = {
  id: true,
  assignmentId: true,
  submittedAt: true,
  assignment: {
    select: {
      id: true,
      title: true,
      kind: true,
      class: { select: { name: true } },
      criteria: {
        orderBy: { position: "asc" },
        select: { id: true, title: true, maxPoints: true, position: true },
      },
    },
  },
  aiGrade: { select: { grader: true, model: true, confidence: true, flags: true } },
  scores: { select: { criterionId: true, aiScore: true, evidenceFound: true } },
} satisfies Prisma.SubmissionSelect;

/**
 * The drafts on To review's page (the teacher's oldest REVIEW_QUEUE_LIMIT),
 * without the paper's text or photos, or only those of one assignment.
 * Mapped with toReviewItem, the To review mapper, so a draft counts as worth
 * rechecking here exactly when To review says so, and only the drafts To
 * review shows are counted.
 */
async function queuedDrafts(teacherId: string, assignmentId?: string): Promise<ReviewItem[]> {
  const page = reviewQueuePage(teacherId);
  let where: Prisma.SubmissionWhereInput = page.where;
  if (assignmentId) {
    // Which of this assignment's drafts are on the page: ids first, then only those drafts in full.
    const onPage = await db.submission.findMany({ ...page, select: { id: true, assignmentId: true } });
    const ids = onPage.filter((row) => row.assignmentId === assignmentId).map((row) => row.id);
    if (ids.length === 0) return [];
    where = { ...page.where, id: { in: ids } };
  }
  const rows = await db.submission.findMany({ where, orderBy: page.orderBy, take: page.take, select: DRAFT_SELECT });
  return rows.map((row) =>
    toReviewItem({
      ...row,
      content: "",
      fileName: null,
      source: "TEXT",
      returnNote: null,
      returnedAt: null,
      teacherFeedback: null,
      student: { id: "", name: "" },
      assignment: {
        ...row.assignment,
        criteria: row.assignment.criteria.map((criterion) => ({ ...criterion, description: "" })),
      },
      aiGrade: row.aiGrade ? { ...row.aiGrade, overallComment: null } : null,
      scores: row.scores.map((score) => ({
        ...score,
        aiJustification: null,
        aiEvidence: null,
        finalScore: null,
        finalComment: null,
      })),
      images: [],
    })
  );
}

function countWorth(items: ReviewItem[], history: OverrideHistory): number {
  return items.filter((item) => recheckFor(item, history).worth).length;
}

/**
 * How many drafts in To review are worth rechecking (recheck.ts), for Home's
 * attention notice. Null when it could not be worked out: the notice then
 * leaves the line out rather than showing a wrong number.
 */
export async function getWorthRecheckingCount(teacherId: string): Promise<number | null> {
  try {
    const [items, history] = await Promise.all([queuedDrafts(teacherId), loadOverrideHistory(teacherId)]);
    return countWorth(items, history);
  } catch (error) {
    console.error("[markwise] Could not count the drafts worth rechecking", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return null;
  }
}

export type AssignmentAgreement = {
  /** null until an approved paper with an AI draft has a comparable score. */
  agreement: AiAgreement | null;
  /** Drafts of this assignment on To review's page. */
  queued: number;
  /** Of those, the ones worth rechecking. */
  worthRechecking: number;
};

/**
 * The "AI vs your grades" card's data for one assignment the caller already
 * checked the teacher owns. Null when it could not be loaded: the page then
 * leaves the card out.
 */
export async function getAssignmentAgreement(
  teacherId: string,
  assignment: { id: string; criteria: { id: string; title: string }[] }
): Promise<AssignmentAgreement | null> {
  try {
    const [rows, queued, history] = await Promise.all([
      approvedScoreRows(teacherId, assignment.id),
      queuedDrafts(teacherId, assignment.id),
      loadOverrideHistory(teacherId, [assignment.id]),
    ]);
    return {
      agreement: summarizeAgreement(assignment.criteria, rows),
      queued: queued.length,
      worthRechecking: countWorth(queued, history),
    };
  } catch (error) {
    console.error("[markwise] Could not compare the AI's scores with the approved ones", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return null;
  }
}
