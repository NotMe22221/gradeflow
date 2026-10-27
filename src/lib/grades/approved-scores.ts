import "server-only";

import { parseGraderKind } from "@/lib/constants";
import { db } from "@/lib/db";
import { summarizeAgreement, type AgreementScoreRow, type AiAgreement } from "@/lib/review/agreement";
import { toReviewItem } from "@/lib/review/map";
import { recheckFor, summarizeOverrides, type OverrideHistory } from "@/lib/review/recheck";

/*
 * Read-only views of the scores a teacher already approved, next to the AI's
 * stored draft scores: the "AI vs your grades" card on the assignment page and
 * the "worth rechecking" counts on Home and that card. Stored data only, no AI
 * call, and never the paper's text. Every query is scoped to the teacher's own
 * classes. Teacher surfaces only: students never see any of this.
 */

/** getReviewQueue's page: To review shows the oldest 200 papers, so the counts here do too. */
const QUEUE_LIMIT = 200;
/** getOverrideHistory's cap on approved criterion scores. */
const APPROVED_SCORE_LIMIT = 5000;

type ApprovedRow = AgreementScoreRow & { assignmentId: string };

/**
 * Criterion scores of this teacher's approved (published) papers that had an
 * AI draft, in these assignments. aiScore is null where the AI's score was
 * discarded; finalScore is the published score.
 */
async function approvedScoreRows(teacherId: string, assignmentIds: string[]): Promise<ApprovedRow[]> {
  if (assignmentIds.length === 0) return [];
  const scores = await db.criterionScore.findMany({
    where: {
      finalScore: { not: null },
      submission: {
        status: "PUBLISHED",
        assignmentId: { in: assignmentIds },
        assignment: { class: { teacherId } },
        aiGrade: { isNot: null },
      },
    },
    select: {
      submissionId: true,
      criterionId: true,
      aiScore: true,
      finalScore: true,
      submission: { select: { assignmentId: true, aiGrade: { select: { grader: true } } } },
    },
    take: APPROVED_SCORE_LIMIT,
  });
  return scores.flatMap((score) =>
    score.finalScore === null || !score.submission.aiGrade
      ? []
      : [
          {
            submissionId: score.submissionId,
            assignmentId: score.submission.assignmentId,
            grader: parseGraderKind(score.submission.aiGrade.grader),
            criterionId: score.criterionId,
            aiScore: score.aiScore,
            finalScore: score.finalScore,
          },
        ]
  );
}

/** The same history getReviewQueue builds: only scores the AI gave and you approved. */
function historyOf(rows: ApprovedRow[]): OverrideHistory {
  return summarizeOverrides(
    rows.flatMap((row) => (row.aiScore === null ? [] : [{ ...row, aiScore: row.aiScore }]))
  );
}

/**
 * How often this teacher changed each grader's score on each criterion of
 * these assignments, over approved papers: the input recheckFor takes. Throws
 * on a database error; callers decide what a failure drops.
 */
export async function loadOverrideHistory(teacherId: string, assignmentIds: string[]): Promise<OverrideHistory> {
  return historyOf(await approvedScoreRows(teacherId, assignmentIds));
}

/**
 * Drafts waiting in To review, without the paper's text or photos: only what
 * recheckFor reads (the AI record, its flags and confidence, and the criterion
 * scores). Mapped with toReviewItem, the To review mapper, so a draft counts as
 * worth rechecking here exactly when To review says so.
 */
async function queuedDrafts(teacherId: string, assignmentId?: string) {
  const rows = await db.submission.findMany({
    where: { status: "NEEDS_REVIEW", assignment: { class: { teacherId } }, ...(assignmentId ? { assignmentId } : {}) },
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    take: QUEUE_LIMIT,
    select: {
      id: true,
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
    },
  });
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

function countWorth(items: Awaited<ReturnType<typeof queuedDrafts>>, history: OverrideHistory): number {
  return items.filter((item) => recheckFor(item, history).worth).length;
}

/**
 * How many drafts in To review are worth rechecking (recheck.ts), for Home's
 * attention notice. Null when it could not be worked out: the notice then
 * leaves the line out rather than showing a wrong number.
 */
export async function getWorthRecheckingCount(teacherId: string): Promise<number | null> {
  try {
    const items = await queuedDrafts(teacherId);
    if (items.length === 0) return 0;
    const assignmentIds = [...new Set(items.map((item) => item.assignment.id))];
    return countWorth(items, await loadOverrideHistory(teacherId, assignmentIds));
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
  /** Drafts of this assignment waiting in To review. */
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
    const [rows, queued] = await Promise.all([
      approvedScoreRows(teacherId, [assignment.id]),
      queuedDrafts(teacherId, assignment.id),
    ]);
    return {
      agreement: summarizeAgreement(assignment.criteria, rows),
      queued: queued.length,
      worthRechecking: countWorth(queued, historyOf(rows)),
    };
  } catch (error) {
    console.error("[markwise] Could not compare the AI's scores with the approved ones", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return null;
  }
}
