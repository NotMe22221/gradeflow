import Link from "next/link";

import { ClassAvatar } from "@/components/classroom/class-avatar";
import { AssignmentIcon } from "@/components/classwork/assignment-icon";
import { PageContainer } from "@/components/page-header";
import { AssignmentRubric, type StudentRubricCriterion } from "@/components/student/assignment-rubric";
import { PaperTile } from "@/components/student/paper-tile";
import { PrivateComments, type PrivateComment } from "@/components/student/private-comments";
import { isAwaitingScan, isOverdue, studentStateFor } from "@/components/student/student-status";
import { SubmissionText } from "@/components/student/submission-text";
import { workStatus } from "@/components/student/todo-model";
import { TurnInForm } from "@/components/student/turn-in-form";
import { PaperTestNotice, ReturnedGrade, TurnedInSteps, YourWorkCard } from "@/components/student/your-work";
import { parseAssignmentKind } from "@/lib/constants";
import { formatDate, formatDueDate, pluralize, wordCount } from "@/lib/format";
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

  const dueText = isTest
    ? assignment.dueDate
      ? `Test day ${formatDueDate(assignment.dueDate)}`
      : "No test date"
    : assignment.dueDate
      ? `Due ${formatDueDate(assignment.dueDate)}`
      : "No due date";

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
    yourWork = <TurnInForm assignmentId={assignment.id} />;
  }

  return (
    <PageContainer className="max-w-5xl">
      <Link
        href={`/student/classes/${encodeURIComponent(assignment.class.id)}/classwork`}
        className="mb-6 -ml-2 inline-flex min-h-10 max-w-full items-center gap-2.5 rounded-full px-2 text-sm text-muted-foreground transition-colors outline-none hover:bg-foreground/[0.04] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <ClassAvatar name={assignment.class.name} className="size-7 text-xs" />
        <span className="truncate">
          <span className="font-medium text-foreground">{assignment.class.name}</span>
          {assignment.class.section ? <span> · {assignment.class.section}</span> : null}
        </span>
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-10 lg:gap-y-6">
        <header className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="flex gap-4">
            <AssignmentIcon isTest={isTest} color={theme.color} className="mt-1 max-sm:hidden" />
            <div className="min-w-0 flex-1">
              <h1
                className="text-[26px] leading-tight font-normal text-balance break-words sm:text-[32px] sm:leading-10"
                style={{ color: theme.color }}
              >
                {assignment.title}
              </h1>
              <p className="tabular mt-1 text-sm text-muted-foreground">
                {teacher} · {formatDate(assignment.createdAt, timeZone)}
              </p>
              <div className="tabular mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm font-medium">
                <span className="text-foreground">
                  {totalPoints > 0 ? pluralize(totalPoints, "point") : "No points"}
                </span>
                <span className={cn(pastDue ? "text-danger" : "text-foreground")}>{dueText}</span>
              </div>
            </div>
          </div>
          <div aria-hidden className="mt-4 h-px" style={{ backgroundColor: theme.color }} />
        </header>

        <aside
          aria-label="Your work and comments"
          className="min-w-0 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        >
          <YourWorkCard status={status}>{yourWork}</YourWorkCard>
          <PrivateComments comments={comments} timeZone={timeZone} />
        </aside>

        <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-2">
          <section aria-labelledby="instructions-heading">
            <h2 id="instructions-heading" className="sr-only">
              Instructions
            </h2>
            {assignment.instructions.trim() ? (
              <div className="max-w-prose text-[15px] leading-7 break-words whitespace-pre-line text-foreground">
                {assignment.instructions}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Your teacher didn&apos;t add instructions.</p>
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
  );
}
