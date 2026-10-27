import { CircleAlert, Clock } from "@/components/icons";

import { AssignmentIcon } from "@/components/classwork/assignment-icon";
import { PageContainer } from "@/components/page-header";
import { StudentAssignmentBreadcrumbs, StudentClassAccentBar } from "@/components/student/assignment-breadcrumbs";
import { AssignmentRubric, type StudentRubricCriterion } from "@/components/student/assignment-rubric";
import { PaperTile } from "@/components/student/paper-tile";
import { PrivateComments, type PrivateComment } from "@/components/student/private-comments";
import { isAwaitingScan, isOverdue, studentStateFor } from "@/components/student/student-status";
import { SubmissionText } from "@/components/student/submission-text";
import { dueWhen, workStatus } from "@/components/student/todo-model";
import { TurnInForm } from "@/components/student/turn-in-form";
import { PaperTestNotice, ReturnedGrade, TurnedInSteps, YourWorkCard } from "@/components/student/your-work";
import { parseAssignmentKind } from "@/lib/constants";
import { formatDate, pluralize, wordCount } from "@/lib/format";
import { parseBreakdown } from "@/lib/grades/breakdown";
import { classTheme } from "@/lib/ui/class-theme";
import { cn } from "@/lib/utils";

export type StudentAssignmentData = {
  assignment: {
    id: string;
    title: string;
    instructions: string;
    kind: string;
    dueDate: Date | null;
    createdAt: Date;
    /** Descriptions are a paper test's answer key: rendered only for essays, and only on the server. */
    criteria: StudentRubricCriterion[];
    class: { id: string; name: string; section: string | null };
  };
  teacherName: string | null;
  /** The signed-in student's own submission: only fields a student may see. */
  submission: {
    content: string;
    fileName: string | null;
    source: string;
    submittedAt: Date;
    status: string;
    returnNote: string | null;
    returnedAt: Date | null;
    publishedGrade: {
      totalScore: number;
      maxScore: number;
      breakdown: string;
      feedback: string | null;
      approvedAt: Date;
      approvedBy: { name: string };
    } | null;
  } | null;
  now: Date;
  /** The viewer's time zone (viewerTimeZone()) for "today" and timestamps; undefined uses the server's. */
  timeZone?: string;
};

/**
 * A student's assignment page, in Google Classroom's layout: details and
 * instructions on the left, and on the right the "Your work" card (status,
 * returned grade, add work and Turn in) with the teacher's private comments.
 * Students never see AI drafts: grades come only from a PublishedGrade.
 */
export function StudentAssignmentView({ assignment, teacherName, submission, now, timeZone }: StudentAssignmentData) {
  const published = submission?.publishedGrade ?? null;
  const state = studentStateFor(submission?.status, published !== null);
  const kind = parseAssignmentKind(assignment.kind);
  const isTest = kind === "TEST";
  const scanned = submission?.source === "SCAN";
  const pastDue = isOverdue(kind, state, assignment.dueDate, now, timeZone);
  const awaitingScan = isAwaitingScan(kind, state, assignment.dueDate, now, timeZone);
  const status = workStatus({ state, kind, pastDue, awaitingScan });
  const theme = classTheme(assignment.class);
  const totalPoints = assignment.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  const paperLabel = scanned ? "Transcription of your paper" : "Your paper";
  // A scan's stored file name is its photo count ("1 photo"), but the student
  // only ever sees the transcription, so it must not title the tile.
  const paperFileName = scanned ? null : (submission?.fileName ?? null);
  const teacher = teacherName ?? "Your teacher";

  // Relative and absolute: "Due in 9 days" and "Mon, Nov 9" (a test: "Test on Friday").
  const due = dueWhen({ dueDate: assignment.dueDate?.toISOString() ?? null, kind }, now, timeZone);
  // Only open work counts down: once it's turned in, graded, or a paper test is
  // waiting for its scan, the date is just a date.
  const open = (state === "not_submitted" || state === "returned") && !awaitingScan;

  // The teacher's notes, oldest first, like a private comment thread.
  const comments: PrivateComment[] = [];
  const note = submission?.returnNote?.trim();
  if (note) {
    comments.push({
      key: "returned",
      author: teacher,
      at: submission?.returnedAt ?? null,
      text: note,
      context: "Sent back for revision",
    });
  }
  const feedback = published?.feedback?.trim();
  if (published && feedback) {
    comments.push({
      key: "feedback",
      author: published.approvedBy.name,
      at: published.approvedAt,
      text: feedback,
      context: "With your grade",
    });
  }

  // The paper itself: a typed paper once it's in (but not while revising, when
  // it sits in the form), and a scan's transcription only with the approved
  // grade (before that it is an unreviewed reading).
  const showPaper = submission !== null && (state === "graded" || (state === "submitted" && !scanned));

  let yourWork: React.ReactNode;
  if (state === "graded" && published && submission) {
    yourWork = (
      <>
        <ReturnedGrade
          totalScore={published.totalScore}
          maxScore={published.maxScore}
          approvedByName={published.approvedBy.name}
          approvedAt={published.approvedAt}
          timeZone={timeZone}
        />
        <PaperTile words={wordCount(submission.content)} fileName={paperFileName} label={paperLabel} />
      </>
    );
  } else if (state === "submitted" && submission) {
    const resubmitted = !!submission.returnedAt && submission.submittedAt.getTime() > submission.returnedAt.getTime();
    yourWork = (
      <>
        {scanned ? null : <PaperTile words={wordCount(submission.content)} fileName={submission.fileName} />}
        <p className="text-sm text-pretty text-muted-foreground">
          {scanned
            ? `${teacher} scanned your paper and is reviewing it. You'll see it here with your grade once it's approved.`
            : "Your teacher is reviewing it. Your grade appears here once it's approved."}
        </p>
        <TurnedInSteps
          doneLabel={scanned ? "Scanned" : resubmitted ? "Resubmitted" : "Turned in"}
          at={submission.submittedAt}
          timeZone={timeZone}
        />
      </>
    );
  } else if (state === "returned" && submission) {
    yourWork = isTest ? (
      <>
        <p className="text-sm text-pretty text-muted-foreground">
          {submission.returnedAt ? `Sent back ${formatDate(submission.returnedAt, timeZone)}. ` : ""}
          {note ? "Read your teacher's note below." : "Your teacher didn't leave a note this time."}
        </p>
        <PaperTestNotice teacherName={teacherName} testDay={assignment.dueDate} awaitingScan={false} sentBack />
      </>
    ) : (
      <>
        <p className="text-sm text-pretty text-muted-foreground">
          {submission.returnedAt ? `Sent back ${formatDate(submission.returnedAt, timeZone)}. ` : ""}
          {note
            ? "Read your teacher's note below, revise your paper, and resubmit it."
            : "Your teacher didn't leave a note this time. Revise your paper and resubmit it."}
        </p>
        <TurnInForm assignmentId={assignment.id} defaultText={submission.content} resubmit />
      </>
    );
  } else if (isTest) {
    yourWork = <PaperTestNotice teacherName={teacherName} testDay={assignment.dueDate} awaitingScan={awaitingScan} />;
  } else {
    yourWork = (
      <>
        {pastDue ? (
          <p className="text-[0.875rem] text-pretty text-muted-foreground">
            You can still turn this in. Add your paper, then turn it in when it&apos;s ready.
          </p>
        ) : null}
        <TurnInForm assignmentId={assignment.id} />
      </>
    );
  }

  return (
    <>
      <StudentClassAccentBar classTitle={assignment.class.name} />
      <PageContainer className="max-w-5xl">
        <StudentAssignmentBreadcrumbs
          classId={assignment.class.id}
          classTitle={assignment.class.name}
          section={assignment.class.section}
          title={assignment.title}
        />

        {/* Two columns once the page itself (not the window) has room: <main> is a container. */}
        <div className="grid grid-cols-1 gap-8 @min-[52rem]:grid-cols-[minmax(0,1fr)_20rem] @min-[52rem]:grid-rows-[auto_1fr] @min-[52rem]:items-start @min-[52rem]:gap-x-10">
          <header className="min-w-0 @min-[52rem]:col-start-1 @min-[52rem]:row-start-1">
            <div className="flex gap-4">
              <AssignmentIcon isTest={isTest} color={theme.color} className="mt-1 max-sm:hidden" />
              <div className="min-w-0 flex-1">
                {/* Big, heavy ink: the class color stays in the icon, the rule under the header and the
                    accent bar under the app bar. */}
                <h1 className="display-title break-words text-foreground">{assignment.title}</h1>
                <p className="tabular mt-2 text-[0.875rem] text-muted-foreground">
                  {teacher} · Posted {formatDate(assignment.createdAt, timeZone)}
                </p>
                <div className="tabular mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[0.875rem]">
                  <span className="font-medium text-foreground">
                    {totalPoints > 0 ? pluralize(totalPoints, "point") : "No points"}
                  </span>
                  {pastDue ? (
                    <span className="inline-flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
                      <CircleAlert className="size-4 shrink-0 text-danger-soft-foreground" aria-hidden />
                      <span className="font-medium text-danger-soft-foreground">Missing</span>
                      <span>
                        · {due.relative}
                        {due.absolute ? ` · ${due.absolute}` : ""}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      {open ? (
                        <>
                          <span className="font-medium">{due.relative}</span>
                          {due.absolute ? <span className="text-muted-foreground"> · {due.absolute}</span> : null}
                        </>
                      ) : (
                        <span>
                          {due.absolute
                            ? `${isTest ? "Test day" : "Due"} ${due.absolute}`
                            : isTest
                              ? "No test date"
                              : "No due date"}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div aria-hidden className="mt-4 h-1 rounded-full" style={{ backgroundColor: theme.accent }} />
          </header>

          <aside
            aria-label="Your work and comments"
            className="min-w-0 space-y-4 @min-[52rem]:col-start-2 @min-[52rem]:row-span-2 @min-[52rem]:row-start-1"
          >
            <YourWorkCard status={status}>{yourWork}</YourWorkCard>
            <PrivateComments comments={comments} timeZone={timeZone} />
          </aside>

          <div className="min-w-0 space-y-6 @min-[52rem]:col-start-1 @min-[52rem]:row-start-2">
            <section aria-labelledby="instructions-heading">
              <h2 id="instructions-heading" className="sr-only">
                Instructions
              </h2>
              {assignment.instructions.trim() ? (
                <div className="max-w-prose text-[0.9375rem] leading-7 break-words whitespace-pre-line text-foreground">
                  {assignment.instructions}
                </div>
              ) : (
                <p className="text-[0.9375rem] text-muted-foreground">Your teacher didn&apos;t add instructions.</p>
              )}
            </section>

            <AssignmentRubric
              criteria={assignment.criteria}
              variant={isTest ? "questions" : "rubric"}
              breakdown={published ? parseBreakdown(published.breakdown) : undefined}
            />

            {showPaper && submission ? (
              <SubmissionText content={submission.content} fileName={paperFileName} label={paperLabel} />
            ) : null}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
