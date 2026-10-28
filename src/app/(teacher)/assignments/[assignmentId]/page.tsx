import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { AiAgreementCard } from "@/components/assignments/ai-agreement-card";
import { AssignmentActions } from "@/components/assignments/assignment-actions";
import { AssignmentBreadcrumbs, ClassAccentBar } from "@/components/assignments/assignment-breadcrumbs";
import { AssignmentTabs, type AssignmentTab } from "@/components/assignments/assignment-tabs";
import { BatchGradingProvider } from "@/components/assignments/batch-grading";
import { BatchProgressCard } from "@/components/assignments/batch-progress-card";
import { PromptCard, RubricCard } from "@/components/assignments/rubric-card";
import { SubmissionsTable } from "@/components/assignments/submissions-table";
import type { EligibleStudent, SubmissionFlag, SubmissionRowData } from "@/components/assignments/types";
import { summarizeStatuses, workCounts } from "@/components/classes/status-summary";
import { AssignmentIcon } from "@/components/classwork/assignment-icon";
import { isPastDueDay } from "@/components/classwork/due";
import { WorkCounts } from "@/components/classwork/work-counts";
import { PageContainer } from "@/components/page-header";
import { getOwnedAssignment } from "@/lib/access";
import { engineFor } from "@/lib/ai/engines";
import { AuthError, requireTeacherPage } from "@/lib/auth/session";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";
import {
  GRADER_LABELS,
  isConfidence,
  isStaleGradingClaim,
  parseAssignmentKind,
  parseGraderKind,
} from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDateTime, formatDueDate, formatRelative, pluralize, wordCount } from "@/lib/format";
import { getAssignmentAgreement } from "@/lib/grades/approved-scores";
import { getGraderInfo, type GraderInfo } from "@/lib/grading/config";
import { describeFlag, parseFlags, type FlagCriterion } from "@/lib/grading/flags";
import { parseSubmissionSource } from "@/lib/review/media";
import { classTheme } from "@/lib/ui/class-theme";

type Params = Promise<{ assignmentId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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
  const engine = engineFor("vision");
  return { kind: engine.kind, label: GRADER_LABELS[engine.kind], model: engine.model };
}

export default async function AssignmentPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const assignment = await loadOwnedAssignment((await params).assignmentId);
  const tabParam = (await searchParams).tab;
  const initialTab: AssignmentTab = tabParam === "instructions" ? "instructions" : "student-work";
  if (!assignment) notFound();
  const kind = parseAssignmentKind(assignment.kind);
  const test = kind === "TEST";

  const [submissions, enrollments, agreement] = await Promise.all([
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
    // "AI vs your grades": stored AI scores against approved ones. Null (no card) if it can't load.
    getAssignmentAgreement(assignment.class.teacherId, assignment),
  ]);

  const now = new Date();
  const timeZone = await viewerTimeZone();
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
        submittedLabel: formatRelative(submission.submittedAt, now, timeZone),
        submittedTitle: formatDateTime(submission.submittedAt, timeZone),
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
  const counts = workCounts(summarizeStatuses(submissions.map((submission) => submission.status), roster.length));
  const meta = [
    assignment.dueDate ? `Due ${formatDueDate(assignment.dueDate)}` : "No due date",
    pluralize(totalPoints, "point"),
    test ? pluralize(assignment.criteria.length, "question") : pluralize(assignment.criteria.length, "criterion", "criteria"),
    test ? "Handwritten test" : null,
  ].filter(Boolean);

  return (
    <BatchGradingProvider assignmentId={assignment.id} graderInfo={getGraderInfo()} rows={rows}>
      <ClassAccentBar classTitle={assignment.class.name} />
      <PageContainer>
        <AssignmentBreadcrumbs
          classId={assignment.classId}
          classTitle={assignment.class.name}
          section={assignment.class.section}
          title={assignment.title}
        />

        <header className="mb-2 flex items-start gap-4">
          <AssignmentIcon
            isTest={test}
            color={classTheme(assignment.class).color}
            className="mt-0.5 size-12 [&_svg]:size-6"
          />
          <div className="min-w-0 space-y-1.5">
            <h1 className="display-title break-words text-foreground">
              {assignment.title}
            </h1>
            <p className="tabular text-sm text-muted-foreground">{meta.join(" · ")}</p>
          </div>
        </header>

        <AssignmentTabs
          initialTab={initialTab}
          studentWork={
            <div className="space-y-6">
              {/* Side by side only when the content area is wide enough for both (a container query, so the drawer counts). */}
              <div className="flex flex-col gap-6 @6xl:flex-row @6xl:items-end @6xl:justify-between">
                <WorkCounts counts={counts} isTest={test} size="lg" />
                <AssignmentActions
                  classId={assignment.classId}
                  kind={kind}
                  eligibleStudents={eligibleStudents}
                  hasRoster={roster.length > 0}
                  missingCount={notSubmitted.length}
                />
              </div>
              <BatchProgressCard />
              <SubmissionsTable
                classId={assignment.classId}
                kind={kind}
                scanGrader={test ? scanGraderInfo() : null}
                notSubmitted={notSubmitted}
                eligibleStudents={eligibleStudents}
                hasRoster={roster.length > 0}
                pastDue={isPastDueDay(assignment.dueDate, now, timeZone)}
              />
              {agreement ? (
                <AiAgreementCard
                  assignmentId={assignment.id}
                  agreement={agreement.agreement}
                  queued={agreement.queued}
                  worthRechecking={agreement.worthRechecking}
                  isTest={test}
                />
              ) : null}
            </div>
          }
          instructions={
            <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
              <PromptCard instructions={assignment.instructions} kind={kind} />
              <RubricCard criteria={assignment.criteria} kind={kind} />
            </div>
          }
        />
      </PageContainer>
    </BatchGradingProvider>
  );
}
