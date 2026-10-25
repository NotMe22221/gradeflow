import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Award, CalendarDays, ListChecks } from "lucide-react";

import { AssignmentActions } from "@/components/assignments/assignment-actions";
import { BatchGradingProvider } from "@/components/assignments/batch-grading";
import { BatchProgressCard } from "@/components/assignments/batch-progress-card";
import { PromptCard, RubricCard } from "@/components/assignments/rubric-card";
import { SubmissionsTable } from "@/components/assignments/submissions-table";
import type { EligibleStudent, SubmissionFlag, SubmissionRowData } from "@/components/assignments/types";
import { PageContainer, PageHeader } from "@/components/page-header";
import { getOwnedAssignment } from "@/lib/access";
import { AuthError, requireTeacherPage } from "@/lib/auth/session";
import { isConfidence } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatRelative, pluralize, wordCount } from "@/lib/format";
import { getGraderInfo } from "@/lib/grading/config";

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

/** AiGrade.flags is a JSON string; anything malformed reads as no flags. */
function parseFlags(json: string): SubmissionFlag[] {
  try {
    const value: unknown = JSON.parse(json);
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const { code, message } = item as { code?: unknown; message?: unknown };
      return typeof message === "string" && message
        ? [{ code: typeof code === "string" ? code : "FLAG", message }]
        : [];
    });
  } catch {
    return [];
  }
}

// Students may resubmit or be graded, but a published grade is final.
const LOCKED_STATUSES = new Set(["PUBLISHED", "APPROVED", "GRADING"]);

export default async function AssignmentPage({ params }: { params: Params }) {
  const assignment = await loadOwnedAssignment((await params).assignmentId);
  if (!assignment) notFound();

  const [submissions, enrollments] = await Promise.all([
    db.submission.findMany({
      where: { assignmentId: assignment.id },
      select: {
        id: true,
        status: true,
        content: true,
        fileName: true,
        submittedAt: true,
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
  const rows: SubmissionRowData[] = submissions
    .map((submission) => ({
      id: submission.id,
      student: submission.student,
      status: submission.status,
      submittedLabel: formatRelative(submission.submittedAt, now),
      submittedTitle: formatDateTime(submission.submittedAt),
      fileName: submission.fileName,
      wordCount: wordCount(submission.content),
      ai:
        submission.aiGrade && isConfidence(submission.aiGrade.confidence)
          ? {
              confidence: submission.aiGrade.confidence,
              grader: submission.aiGrade.grader === "claude" ? ("claude" as const) : ("demo" as const),
              flags: parseFlags(submission.aiGrade.flags),
            }
          : null,
      published: submission.publishedGrade
        ? { total: submission.publishedGrade.totalScore, max: submission.publishedGrade.maxScore }
        : null,
    }))
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
                {pluralize(assignment.criteria.length, "criterion", "criteria")}
              </span>
            </span>
          }
          actions={
            <AssignmentActions
              classId={assignment.classId}
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
            notSubmitted={notSubmitted}
            eligibleStudents={eligibleStudents}
            hasRoster={roster.length > 0}
          />
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <RubricCard criteria={assignment.criteria} />
            <PromptCard instructions={assignment.instructions} />
          </div>
        </div>
      </PageContainer>
    </BatchGradingProvider>
  );
}
