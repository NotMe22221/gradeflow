import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Award, CalendarDays, ListChecks, PenLine } from "lucide-react";

import { AssignmentActions } from "@/components/assignments/assignment-actions";
import { BatchGradingProvider } from "@/components/assignments/batch-grading";
import { BatchProgressCard } from "@/components/assignments/batch-progress-card";
import { PromptCard, RubricCard } from "@/components/assignments/rubric-card";
import { SubmissionsTable } from "@/components/assignments/submissions-table";
import type { EligibleStudent, SubmissionFlag, SubmissionRowData } from "@/components/assignments/types";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { getOwnedAssignment } from "@/lib/access";
import { modelFor, openAiConfigured } from "@/lib/ai/openai";
import { AuthError, requireTeacherPage } from "@/lib/auth/session";
import {
  GRADER_LABELS,
  isConfidence,
  isStaleGradingClaim,
  parseAssignmentKind,
  parseGraderKind,
} from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatRelative, pluralize, wordCount } from "@/lib/format";
import { getGraderInfo, type GraderInfo } from "@/lib/grading/config";
import { describeFlag, parseFlags, type FlagCriterion } from "@/lib/grading/flags";
import { parseSubmissionSource } from "@/lib/review/media";

type Params = Promise<{ assignmentId: string }>;

/** The teacher's own assignment, or null. Shared by metadata and the page. */
const loadOwnedAssignment = cache(async (assignmentId: string) => {
  const teacher = await requireTeacherPage();
  if (assignmentId.length > 64) return null;
  try {
    return await getOwnedAssignment(teacher.id, assignmentId);
  } catch (error) {
    if (error instanceof AuthError) return null;
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const assignment = await loadOwnedAssignment((await params).assignmentId);
  return { title: assignment?.title ?? "Assignment" };
}

/**
 * Stored flags in the same teacher-facing wording as the review queue.
 * describeFlag never echoes text injected into the paper.
 */
function displayFlags(json: string, criteria: FlagCriterion[]): SubmissionFlag[] {
  return parseFlags(json).map((flag) => {
    const { criterionLabel, message } = describeFlag(flag, criteria);
    return { code: flag.code, message: criterionLabel ? `${criterionLabel}: ${message}` : message };
  });
}

// Students may resubmit or be graded, but a published grade is final.
const LOCKED_STATUSES = new Set(["PUBLISHED", "APPROVED", "GRADING"]);

/** The camera grader that reads scanned tests. Names the engine only, never the key. */
function scanGraderInfo(): GraderInfo {
  return openAiConfigured()
    ? { kind: "openai", label: GRADER_LABELS.openai, model: modelFor("vision") }
    : { kind: "demo", label: GRADER_LABELS.demo, model: null };
}

export default async function AssignmentPage({ params }: { params: Params }) {
  const assignment = await loadOwnedAssignment((await params).assignmentId);
  if (!assignment) notFound();
  const kind = parseAssignmentKind(assignment.kind);
  const test = kind === "TEST";

  const [submissions, enrollments] = await Promise.all([
    db.submission.findMany({
      where: { assignmentId: assignment.id },
      select: {
        id: true,
        status: true,
        content: true,
        fileName: true,
        source: true,
        submittedAt: true,
        updatedAt: true,
        _count: { select: { images: true } },
        student: { select: { id: true, name: true } },
        aiGrade: { select: { confidence: true, grader: true, flags: true } },
        publishedGrade: { select: { totalScore: true, maxScore: true } },
      },
    }),
    db.enrollment.findMany({
      where: { classId: assignment.classId, student: { role: "STUDENT" } },
      orderBy: { student: { name: "asc" } },
      select: { student: { select: { id: true, name: true } } },
    }),
  ]);

  const now = new Date();
  const flagCriteria: FlagCriterion[] = assignment.criteria.map(({ id, title, maxPoints }) => ({ id, title, maxPoints }));
  const rows: SubmissionRowData[] = submissions
    .map((submission) => {
      // Shown as a failed run so it gets Retry and joins the batch; the grade
      // route takes over the stale claim.
      const interrupted = isStaleGradingClaim(submission.status, submission.updatedAt, now.getTime());
      return {
        id: submission.id,
        student: submission.student,
        status: interrupted ? "GRADING_FAILED" : submission.status,
        interrupted,
        submittedAt: submission.submittedAt.toISOString(),
        submittedLabel: formatRelative(submission.submittedAt, now),
        submittedTitle: formatDateTime(submission.submittedAt),
        fileName: submission.fileName,
        source: parseSubmissionSource(submission.source),
        pageCount: submission._count.images,
        wordCount: wordCount(submission.content),
        ai:
          submission.aiGrade && isConfidence(submission.aiGrade.confidence)
            ? {
                confidence: submission.aiGrade.confidence,
                grader: parseGraderKind(submission.aiGrade.grader),
                flags: displayFlags(submission.aiGrade.flags, flagCriteria),
              }
            : null,
        published: submission.publishedGrade
          ? { total: submission.publishedGrade.totalScore, max: submission.publishedGrade.maxScore }
          : null,
      };
    })
    .sort((a, b) => a.student.name.localeCompare(b.student.name));

  const statusByStudent = new Map(submissions.map((submission) => [submission.student.id, submission.status]));
  const roster = enrollments.map((enrollment) => enrollment.student);
  const notSubmitted = roster.filter((student) => !statusByStudent.has(student.id));
  const eligibleStudents: EligibleStudent[] = roster
    .filter((student) => !LOCKED_STATUSES.has(statusByStudent.get(student.id) ?? ""))
    .map((student) => ({ ...student, currentStatus: statusByStudent.get(student.id) ?? null }));

  const totalPoints = assignment.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  const classLabel = [assignment.class.name, assignment.class.section].filter(Boolean).join(" · ");

  return (
    <BatchGradingProvider assignmentId={assignment.id} graderInfo={getGraderInfo()} rows={rows}>
      <PageContainer>
        <PageHeader
          eyebrow={
            <Link
              href={`/classes/${assignment.classId}`}
              className="rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              {classLabel}
            </Link>
          }
          title={assignment.title}
          description={
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {test ? (
                <Badge variant="secondary">
                  <PenLine aria-hidden />
                  Handwritten test
                </Badge>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden />
                {assignment.dueDate ? `Due ${formatDate(assignment.dueDate)}` : "No due date"}
              </span>
              <span className="tabular inline-flex items-center gap-1.5">
                <Award className="size-4" aria-hidden />
                {pluralize(totalPoints, "point")}
              </span>
              <span className="tabular inline-flex items-center gap-1.5">
                <ListChecks className="size-4" aria-hidden />
                {test
                  ? pluralize(assignment.criteria.length, "question")
                  : pluralize(assignment.criteria.length, "criterion", "criteria")}
              </span>
            </span>
          }
          actions={
            <AssignmentActions
              classId={assignment.classId}
              kind={kind}
              eligibleStudents={eligibleStudents}
              hasRoster={roster.length > 0}
              missingCount={notSubmitted.length}
            />
          }
        />

        <BatchProgressCard />

        <div className="space-y-6">
          <SubmissionsTable
            classId={assignment.classId}
            kind={kind}
            scanGrader={test ? scanGraderInfo() : null}
            notSubmitted={notSubmitted}
            eligibleStudents={eligibleStudents}
            hasRoster={roster.length > 0}
          />
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <RubricCard criteria={assignment.criteria} kind={kind} />
            <PromptCard instructions={assignment.instructions} kind={kind} />
          </div>
        </div>
      </PageContainer>
    </BatchGradingProvider>
  );
}
