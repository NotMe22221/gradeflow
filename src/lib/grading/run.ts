import "server-only";

import { getOwnedSubmission } from "@/lib/access";
import {
  AI_RERUNNABLE_STATUSES,
  parseAssignmentKind,
  STALE_GRADING_CLAIM_MS,
  type Confidence,
  type GraderKind,
  type SubmissionStatus,
} from "@/lib/constants";
import { db, transaction } from "@/lib/db";
import { getGrader } from "@/lib/grading";
import type { Grader, GradingInput, ValidatedGrading } from "@/lib/grading/types";
import { GradingError, validateGrading } from "@/lib/grading/validate";
import { gradeTestAnswers } from "@/lib/scan/finalize";

export { GradingError } from "@/lib/grading/validate";

/**
 * The AI first pass for one submission.
 *
 * This module writes only AiGrade, CriterionScore, Submission.status
 * (GRADING, NEEDS_REVIEW, or GRADING_FAILED), and Submission.teacherFeedback,
 * which a finished run resets to null: a re-run replaces the previous
 * suggestion together with the teacher's draft edits, including the draft
 * overall note. It never touches the published gradebook: publishing happens
 * only through an explicit teacher approval in lib/grades/publish.ts.
 *
 * The grading path follows the assignment kind, not the entry point: typed
 * essays get the essay grader, and typed answers on a handwritten test (TEST)
 * get the test path (answer-key matching in demo mode, validated like a
 * scanned test), so a correct short answer is never judged as a short essay.
 */

export type RunResult = {
  id: string;
  status: SubmissionStatus;
  confidence: Confidence | null;
  grader: GraderKind;
  flagCount: number;
};

/** The submission is not in a state that can be graded right now (HTTP 409). */
export class GradingConflictError extends Error {
  readonly status = 409;
  constructor(message: string) {
    super(message);
    this.name = "GradingConflictError";
  }
}

function conflictMessage(status: string): string {
  switch (status) {
    case "GRADING":
      return "This paper is already being graded.";
    case "APPROVED":
    case "PUBLISHED":
      return "This paper already has a published grade.";
    case "RETURNED":
      return "This paper was sent back to the student. It can be graded again after they resubmit.";
    default:
      return "This paper cannot be graded right now.";
  }
}

/** Atomically move the submission to GRADING so two runs never overlap. */
async function claimSubmission(submissionId: string): Promise<void> {
  const claimed = await db.submission.updateMany({
    where: { id: submissionId, status: { in: AI_RERUNNABLE_STATUSES } },
    data: { status: "GRADING", updatedAt: new Date() },
  });
  if (claimed.count === 1) return;

  // Recover a claim left behind by a request that died mid-grade. The
  // updatedAt condition makes the takeover itself atomic.
  const recovered = await db.submission.updateMany({
    where: { id: submissionId, status: "GRADING", updatedAt: { lt: new Date(Date.now() - STALE_GRADING_CLAIM_MS) } },
    data: { status: "GRADING", updatedAt: new Date() },
  });
  if (recovered.count === 1) return;

  const current = await db.submission.findUnique({ where: { id: submissionId }, select: { status: true } });
  throw new GradingConflictError(conflictMessage(current?.status ?? ""));
}

async function markFailed(submissionId: string): Promise<void> {
  try {
    await db.submission.updateMany({
      where: { id: submissionId, status: "GRADING" },
      data: { status: "GRADING_FAILED" },
    });
  } catch (error) {
    console.error("[gradesmart] Could not mark submission as failed", {
      submissionId,
      type: error instanceof Error ? error.name : typeof error,
    });
  }
}

/**
 * The demo grader answers instantly. A short pause, derived from the paper's
 * length so it stays deterministic, keeps the batch progress bar and loading
 * states visible in the demo and roughly mirrors real grading latency.
 */
function demoPause(paper: string): Promise<void> {
  const ms = 700 + (paper.length % 500);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Grade and validate one paper on the path its assignment kind needs. */
async function gradeForKind(test: boolean, grader: Grader, input: GradingInput): Promise<ValidatedGrading> {
  if (test) return gradeTestAnswers(grader, input);
  return validateGrading(await grader.grade(input), input);
}

async function saveGrading(
  submissionId: string,
  grader: { kind: GraderKind; model: string | null },
  result: ValidatedGrading
): Promise<void> {
  await transaction(async (tx) => {
    // Only finish a run that still holds the claim; anything else rolls back.
    // Clearing teacherFeedback drops the draft overall note from a previous run.
    const finished = await tx.submission.updateMany({
      where: { id: submissionId, status: "GRADING" },
      data: { status: "NEEDS_REVIEW", teacherFeedback: null },
    });
    if (finished.count !== 1) {
      throw new GradingConflictError("This paper changed while it was being graded. Refresh and try again.");
    }

    const aiGrade = {
      grader: grader.kind,
      model: grader.model,
      confidence: result.confidence,
      overallComment: result.overallComment || null,
      flags: JSON.stringify(result.flags),
    };
    await tx.aiGrade.upsert({
      where: { submissionId },
      create: { submissionId, ...aiGrade },
      update: { ...aiGrade, createdAt: new Date() },
    });

    // A re-run replaces the previous suggestion and any draft edits.
    await tx.criterionScore.deleteMany({ where: { submissionId } });
    await tx.criterionScore.createMany({
      data: result.criteria.map((criterion) => ({
        submissionId,
        criterionId: criterion.criterionId,
        aiScore: criterion.aiScore,
        aiJustification: criterion.justification,
        aiEvidence: criterion.evidence,
        evidenceFound: criterion.evidenceFound,
        finalScore: null,
        finalComment: null,
      })),
    });
  });
}

export async function runAiFirstPass(teacherId: string, submissionId: string): Promise<RunResult> {
  // Ownership first: a teacher can only grade papers in their own classes.
  const submission = await getOwnedSubmission(teacherId, submissionId);
  const { assignment } = submission;
  if (assignment.criteria.length === 0) {
    throw new GradingError("Add at least one rubric criterion before running the AI pass.", 422);
  }

  await claimSubmission(submission.id);

  const grader = getGrader();
  let result: ValidatedGrading;
  try {
    // Re-read the paper after claiming, in case it was resubmitted in between.
    const current = await db.submission.findUnique({ where: { id: submission.id }, select: { content: true } });
    if (!current) throw new GradingConflictError("This paper no longer exists.");

    const input: GradingInput = {
      assignmentTitle: assignment.title,
      instructions: assignment.instructions,
      criteria: assignment.criteria.map((criterion) => ({
        id: criterion.id,
        title: criterion.title,
        description: criterion.description,
        maxPoints: criterion.maxPoints,
      })),
      paper: current.content,
    };

    const test = parseAssignmentKind(assignment.kind) === "TEST";
    [result] = await Promise.all([
      gradeForKind(test, grader, input),
      grader.kind === "demo" ? demoPause(input.paper) : Promise.resolve(),
    ]);
    await saveGrading(submission.id, grader, result);
  } catch (error) {
    if (error instanceof GradingConflictError) throw error;
    await markFailed(submission.id);
    if (error instanceof GradingError) throw error;
    console.error("[gradesmart] AI first pass failed", {
      submissionId: submission.id,
      type: error instanceof Error ? error.name : typeof error,
    });
    throw new GradingError("The AI pass failed. Try again.");
  }

  return {
    id: submission.id,
    status: "NEEDS_REVIEW",
    confidence: result.confidence,
    grader: grader.kind,
    flagCount: result.flags.length,
  };
}
