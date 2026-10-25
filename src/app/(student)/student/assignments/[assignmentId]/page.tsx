import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArrowLeft, CalendarDays } from "lucide-react";

import { PageContainer, PageHeader } from "@/components/page-header";
import { AssignmentRubric } from "@/components/student/assignment-rubric";
import { GradeCard } from "@/components/student/grade-card";
import { parsePublishedBreakdown } from "@/components/student/published-breakdown";
import { ReturnedNotice } from "@/components/student/returned-notice";
import { StudentStateBadge } from "@/components/student/student-state-badge";
import { isPastDue, studentStateFor } from "@/components/student/student-status";
import { SubmitPaperForm } from "@/components/student/submit-paper-form";
import { SubmittedCard } from "@/components/student/submitted-card";
import { Card } from "@/components/ui/card";
import { getEnrolledAssignment } from "@/lib/access";
import { AuthError, requireStudentPage } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate, formatScore, pluralize } from "@/lib/format";
import { MAX_PAPER_CHARS, MIN_PAPER_CHARS } from "@/lib/submissions";

type PageProps = { params: Promise<{ assignmentId: string }> };

/** Shared by generateMetadata and the page; enrollment is checked once per request. */
const loadEnrolledAssignment = cache(async (assignmentId: string) => {
  const student = await requireStudentPage();
  let assignment: Awaited<ReturnType<typeof getEnrolledAssignment>>;
  try {
    assignment = await getEnrolledAssignment(student.id, assignmentId);
  } catch (error) {
    if (error instanceof AuthError) notFound();
    throw error;
  }
  return { student, assignment };
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { assignmentId } = await params;
  const { assignment } = await loadEnrolledAssignment(assignmentId);
  return { title: assignment.title };
}

export default async function StudentAssignmentPage({ params }: PageProps) {
  const { assignmentId } = await params;
  const { student, assignment } = await loadEnrolledAssignment(assignmentId);

  // Only the signed-in student's own submission, and only fields a student may
  // see. AiGrade, CriterionScore, and draft review state are never selected.
  const [submission, teacher] = await Promise.all([
    db.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
      select: {
        content: true,
        fileName: true,
        submittedAt: true,
        status: true,
        returnNote: true,
        returnedAt: true,
        publishedGrade: {
          select: {
            totalScore: true,
            maxScore: true,
            breakdown: true,
            feedback: true,
            approvedAt: true,
            approvedBy: { select: { name: true } },
          },
        },
      },
    }),
    db.user.findUnique({ where: { id: assignment.class.teacherId }, select: { name: true } }),
  ]);

  const published = submission?.publishedGrade ?? null;
  const state = studentStateFor(submission?.status, published !== null);
  const totalPoints = assignment.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  const pastDue = state === "not_submitted" && isPastDue(assignment.dueDate, new Date());
  const classLabel = [assignment.class.name, assignment.class.section].filter(Boolean).join(" · ");

  return (
    <PageContainer>
      <Link
        href="/student"
        className="mb-6 -ml-1 inline-flex items-center gap-1.5 rounded-md px-1 text-[13px] font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Your assignments
      </Link>

      <PageHeader
        eyebrow={classLabel}
        title={assignment.title}
        description={
          <>
            <span className="tabular inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden />
              {assignment.dueDate ? `Due ${formatDate(assignment.dueDate)}` : "No due date"}
            </span>
            {pastDue ? <span className="font-medium text-danger-soft-foreground"> · Past due</span> : null}
            {totalPoints > 0 ? <span className="tabular"> · {pluralize(totalPoints, "point")}</span> : null}
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <StudentStateBadge state={state} />
            {published ? (
              <span className="tabular text-sm font-semibold text-foreground">
                <span className="sr-only">Score: </span>
                {formatScore(published.totalScore, published.maxScore)}
              </span>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="instructions-heading" className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Card className="p-5 sm:p-6">
            <h2 id="instructions-heading" className="text-base font-semibold tracking-tight text-foreground">
              Instructions
            </h2>
            <div className="mt-3 max-w-prose text-[15px] leading-7 break-words whitespace-pre-line text-foreground/90">
              {assignment.instructions}
            </div>
          </Card>
        </section>

        <AssignmentRubric
          criteria={assignment.criteria}
          className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        />

        <section aria-label="Your paper" className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-2">
          {state === "graded" && published && submission ? (
            <GradeCard
              totalScore={published.totalScore}
              maxScore={published.maxScore}
              breakdown={parsePublishedBreakdown(published.breakdown)}
              feedback={published.feedback}
              approvedByName={published.approvedBy.name}
              approvedAt={published.approvedAt}
              content={submission.content}
              fileName={submission.fileName}
            />
          ) : state === "submitted" && submission ? (
            <SubmittedCard
              submittedAt={submission.submittedAt}
              returnedAt={submission.returnedAt}
              content={submission.content}
              fileName={submission.fileName}
            />
          ) : state === "returned" && submission ? (
            <>
              <ReturnedNotice
                returnNote={submission.returnNote}
                returnedAt={submission.returnedAt}
                teacherName={teacher?.name ?? null}
              />
              <Card className="p-5 sm:p-6">
                <div className="mb-6 space-y-1.5">
                  <h2 className="text-base font-semibold tracking-tight text-foreground">
                    Resubmit your paper
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Your previous text is filled in below. Edit it, or upload a new .txt file.
                  </p>
                </div>
                <SubmitPaperForm
                  assignmentId={assignment.id}
                  defaultText={submission.content}
                  resubmit
                  maxChars={MAX_PAPER_CHARS}
                  minChars={MIN_PAPER_CHARS}
                />
              </Card>
            </>
          ) : (
            <Card className="p-5 sm:p-6">
              <div className="mb-6 space-y-1.5">
                <h2 className="text-base font-semibold tracking-tight text-foreground">Submit your paper</h2>
                <p className="text-sm text-muted-foreground">
                  Paste your paper or upload it as a .txt file. You can submit once; your teacher can send it
                  back if it needs changes.
                </p>
              </div>
              <SubmitPaperForm
                assignmentId={assignment.id}
                maxChars={MAX_PAPER_CHARS}
                minChars={MIN_PAPER_CHARS}
              />
            </Card>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
