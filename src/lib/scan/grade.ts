import "server-only";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getOwnedAssignment } from "@/lib/access";
import { modelFor, openAiConfigured } from "@/lib/ai/openai";
import { AuthError } from "@/lib/auth/session";
import { parseAssignmentKind, type SubmissionStatus } from "@/lib/constants";
import { db } from "@/lib/db";
import { describeFlag, serializeFlags, type FlagCriterion } from "@/lib/grading/flags";
import type { GradingInput, RawGradingResult, ValidatedGrading } from "@/lib/grading/types";
import { normalizePaperText } from "@/lib/paper";
import { gradeScanWithDemo } from "@/lib/scan/demo-grader";
import { validateScanGrading } from "@/lib/scan/finalize";
import type { CheckedImage } from "@/lib/scan/form";
import { findSampleTestByHash } from "@/lib/scan/samples";
import {
  NEEDS_TRANSCRIPTION_MESSAGE,
  NOT_A_TEST_MESSAGE,
  TRANSCRIPTION_PREVIEW_LINES,
  type ScanErrorCode,
  type ScanGrader,
  type ScanGradeSuccess,
  type TranscriptionSource,
} from "@/lib/scan/types";
import { gradeWithVision, VisionGradingError } from "@/lib/scan/vision";
import type { Legibility, MappedVisionOutput } from "@/lib/scan/vision-prompt";
import { TEACHER_REPLACEABLE_STATUSES } from "@/lib/submissions";
import { demoScanModel } from "@/lib/review/media";

/**
 * The camera grader pipeline behind POST /api/grade:
 *
 *   ownership + enrollment -> replaceable check -> GPT-4o vision (or the demo
 *   scanner) -> validation -> one transaction that stores the submission,
 *   its photos, the AI suggestion, and the per-question scores.
 *
 * Like lib/grading, this writes only Submission (as NEEDS_REVIEW),
 * SubmissionImage, AiGrade, and CriterionScore. It never writes
 * PublishedGrade or sets APPROVED/PUBLISHED: a scanned test publishes only
 * through the teacher approval gate in lib/grades. When the AI step fails,
 * nothing is stored.
 */

/** A scan failure whose message is safe to show to the teacher. */
export class ScanError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: ScanErrorCode
  ) {
    super(message);
    this.name = "ScanError";
  }
}

export type ScanRequest = {
  assignmentId: string;
  studentId: string;
  /** Checked and sniffed by readScanImage(), in page order. */
  pages: CheckedImage[];
  answerKey: CheckedImage | null;
  /** Demo mode only: normalized text the teacher typed for an unknown photo. */
  transcription: string;
};

const CHANGED_MESSAGE = "This student's paper changed a moment ago. Refresh and try again.";

function conflictMessage(status: string): string {
  switch (status) {
    case "PUBLISHED":
    case "APPROVED":
      return "This student's paper already has a published grade. Published grades are never overwritten.";
    case "GRADING":
      return "This student's paper is being graded right now. Try again in a moment.";
    default:
      return "This student's paper can't be replaced right now.";
  }
}

function isReplaceable(status: string): boolean {
  return TEACHER_REPLACEABLE_STATUSES.includes(status as SubmissionStatus);
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

class ScanConflict extends Error {}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * The demo scanner answers instantly. A short pause, derived from the text so
 * it stays deterministic, keeps the progress state visible in the demo.
 */
function demoPause(text: string): Promise<void> {
  const ms = 1200 + (text.length % 600);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function photoLabel(count: number): string {
  return count === 1 ? "1 photo" : `${count} photos`;
}

type ReadResult = {
  raw: RawGradingResult;
  transcription: string;
  legibility: Legibility;
  grader: ScanGrader;
  model: string | null;
  source: TranscriptionSource;
};

async function readWithVision(input: Omit<GradingInput, "paper">, request: ScanRequest): Promise<ReadResult> {
  let output: MappedVisionOutput;
  try {
    output = await gradeWithVision(input, request.pages, request.answerKey);
  } catch (error) {
    if (error instanceof VisionGradingError) throw new ScanError(error.message, 502);
    console.error("[gradesmart] Camera grading failed", { type: error instanceof Error ? error.name : typeof error });
    throw new ScanError("The AI request failed. Try again.", 502);
  }
  if (!output.transcription) {
    throw new ScanError(
      "GPT-4o found no handwriting on these photos. Retake them closer, in good light, and try again.",
      422
    );
  }
  return { ...output, grader: "openai", model: modelFor("vision"), source: "vision" };
}

async function readWithDemo(input: Omit<GradingInput, "paper">, request: ScanRequest): Promise<ReadResult> {
  // The demo scanner can't read handwriting: it recognizes the bundled sample
  // photos by their exact bytes, or uses what the teacher typed.
  const sample = findSampleTestByHash(sha256Hex(request.pages[0].bytes));
  let transcription: string;
  let source: TranscriptionSource;
  if (sample) {
    transcription = normalizePaperText(sample.transcription);
    source = "sample";
  } else if (request.transcription) {
    transcription = request.transcription;
    source = "typed";
  } else {
    throw new ScanError(NEEDS_TRANSCRIPTION_MESSAGE, 400, "NEEDS_TRANSCRIPTION");
  }
  const raw = gradeScanWithDemo({ ...input, paper: transcription });
  await demoPause(transcription);
  // Stored as AiGrade.model so the review queue can say where the text came from.
  return { raw, transcription, legibility: "clear", grader: "demo", model: demoScanModel(source), source };
}

async function saveScan(args: {
  assignmentId: string;
  studentId: string;
  transcription: string;
  pages: CheckedImage[];
  grader: ScanGrader;
  model: string | null;
  result: ValidatedGrading;
}): Promise<string> {
  const { assignmentId, studentId, result } = args;
  return db.$transaction(async (tx) => {
    const submissionData = {
      content: args.transcription,
      fileName: photoLabel(args.pages.length),
      source: "SCAN",
      submittedAt: new Date(),
      status: "NEEDS_REVIEW",
      // A new scan replaces the previous suggestion and every draft edit.
      // returnNote/returnedAt stay so the history of a send-back is visible.
      teacherFeedback: null,
      approvedAt: null,
      approvedById: null,
    };

    // Re-check inside the transaction: the paper may have been approved,
    // claimed for grading, or created while the photos were being read.
    const current = await tx.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      select: { id: true },
    });
    let submissionId: string;
    if (current) {
      const replaced = await tx.submission.updateMany({
        where: { id: current.id, status: { in: TEACHER_REPLACEABLE_STATUSES } },
        data: submissionData,
      });
      if (replaced.count !== 1) throw new ScanConflict();
      submissionId = current.id;
    } else {
      const created = await tx.submission.create({
        data: { assignmentId, studentId, ...submissionData },
        select: { id: true },
      });
      submissionId = created.id;
    }

    await tx.submissionImage.deleteMany({ where: { submissionId } });
    for (const [position, page] of args.pages.entries()) {
      await tx.submissionImage.create({
        data: { submissionId, position, mimeType: page.mimeType, data: page.bytes },
      });
    }

    const aiGrade = {
      grader: args.grader,
      model: args.model,
      confidence: result.confidence,
      overallComment: result.overallComment || null,
      flags: serializeFlags(result.flags),
    };
    await tx.aiGrade.upsert({
      where: { submissionId },
      create: { submissionId, ...aiGrade },
      update: { ...aiGrade, createdAt: new Date() },
    });

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
    return submissionId;
  });
}

export async function gradeScannedTest(teacherId: string, request: ScanRequest): Promise<ScanGradeSuccess> {
  // Ownership first: a teacher can only scan into their own classes.
  const assignment = await getOwnedAssignment(teacherId, request.assignmentId);
  // The scanner grades answers against an answer key. Essays need the essay
  // grader, so they are added as typed papers on the assignment page.
  if (parseAssignmentKind(assignment.kind) !== "TEST") {
    throw new ScanError(NOT_A_TEST_MESSAGE, 422);
  }
  if (assignment.criteria.length === 0) {
    throw new ScanError("Add the answer key questions to this assignment before scanning tests.", 422);
  }

  const enrollment = await db.enrollment.findFirst({
    where: { classId: assignment.classId, studentId: request.studentId, student: { role: "STUDENT" } },
    select: { student: { select: { id: true, name: true } } },
  });
  if (!enrollment) throw new AuthError("That student isn't enrolled in this class.", 404);

  // Check before spending an AI call; saveScan re-checks atomically.
  const existing = await db.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: enrollment.student.id } },
    select: { status: true },
  });
  if (existing && !isReplaceable(existing.status)) throw new ScanError(conflictMessage(existing.status), 409);

  const input: Omit<GradingInput, "paper"> = {
    assignmentTitle: assignment.title,
    instructions: assignment.instructions,
    criteria: assignment.criteria.map((criterion) => ({
      id: criterion.id,
      title: criterion.title,
      description: criterion.description,
      maxPoints: criterion.maxPoints,
    })),
  };

  const read = openAiConfigured() ? await readWithVision(input, request) : await readWithDemo(input, request);
  const result = validateScanGrading(read.raw, { ...input, paper: read.transcription }, read.legibility);

  let submissionId: string;
  try {
    submissionId = await saveScan({
      assignmentId: assignment.id,
      studentId: enrollment.student.id,
      transcription: read.transcription,
      pages: request.pages,
      grader: read.grader,
      model: read.model,
      result,
    });
  } catch (error) {
    if (error instanceof ScanConflict || isUniqueViolation(error)) {
      const latest = await db.submission.findUnique({
        where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: enrollment.student.id } },
        select: { status: true },
      });
      throw new ScanError(latest && !isReplaceable(latest.status) ? conflictMessage(latest.status) : CHANGED_MESSAGE, 409);
    }
    throw error;
  }

  revalidatePath("/", "layout");

  const flagCriteria: FlagCriterion[] = assignment.criteria.map(({ id, title, maxPoints }) => ({ id, title, maxPoints }));
  const flags = result.flags.map((flag) => {
    const { criterionLabel, message } = describeFlag(flag, flagCriteria);
    return criterionLabel ? `${criterionLabel}: ${message}` : message;
  });
  const scored = result.criteria.filter((criterion) => criterion.aiScore !== null);
  const lines = read.transcription.split("\n").filter((line) => line.trim());

  return {
    ok: true,
    submissionId,
    status: "NEEDS_REVIEW",
    grader: read.grader,
    // The API contract reports no model for demo output.
    model: read.grader === "demo" ? null : read.model,
    confidence: result.confidence,
    flagCount: result.flags.length,
    assignmentId: assignment.id,
    assignmentTitle: assignment.title,
    studentName: enrollment.student.name,
    pageCount: request.pages.length,
    transcriptionSource: read.source,
    transcriptionPreview: lines.slice(0, TRANSCRIPTION_PREVIEW_LINES),
    transcriptionLineCount: lines.length,
    flags,
    draftScore: scored.length > 0 ? scored.reduce((sum, criterion) => sum + (criterion.aiScore ?? 0), 0) : null,
    maxScore: assignment.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0),
    unscoredCount: result.criteria.length - scored.length,
  };
}
