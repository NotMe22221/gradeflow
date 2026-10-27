import Link from "next/link";
import { ClipboardList, SquareUserRound } from "@/components/icons";

import { AssignmentIcon } from "@/components/classwork/assignment-icon";
import { PageCornerDecor } from "@/components/decor/student";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  dueWhen,
  dueWhenText,
  PAPER_TEST_NOTE,
  scoreText,
  workStatus,
  type StudentWorkRow,
} from "@/components/student/todo-model";
import { WorkStatusChip } from "@/components/student/work-status-chip";
import { Button } from "@/components/ui/button";
import { formatDate, pluralize } from "@/lib/format";

const TOPICS: { key: "assignments" | "tests"; title: string; isTest: boolean; noun: string }[] = [
  { key: "assignments", title: "Assignments", isTest: false, noun: "assignment" },
  { key: "tests", title: "Paper tests", isTest: true, noun: "test" },
];

/**
 * A class's Classwork as the student sees it: a display title (with "View
 * your work" beside it and paint in the corner), then Classroom's topics
 * (Assignments, Paper tests), newest first, each with this student's own
 * status as an icon and a word (Assigned, Missing, Turned in, Returned with
 * the grade). Open work shows its due date two ways ("Due in 9 days · Mon,
 * Nov 9"). Paper tests say the teacher scans them.
 */
export function StudentClasswork({
  classId,
  classColor,
  rows,
  now,
  timeZone,
}: {
  classId: string;
  classColor: string;
  rows: StudentWorkRow[];
  now: Date;
  /** The viewer's time zone (viewerTimeZone()); undefined uses the server's. */
  timeZone?: string;
}) {
  const sorted = [...rows].sort((a, b) => b.postedAt.localeCompare(a.postedAt) || a.title.localeCompare(b.title));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Classwork"
        actions={
          <Button asChild variant="tonal">
            <Link href={`/student/todo?class=${encodeURIComponent(classId)}`}>
              <SquareUserRound aria-hidden />
              View your work
            </Link>
          </Button>
        }
        decor={<PageCornerDecor tones={["lilac", "yellow"]} />}
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Your teacher hasn't posted any classwork yet."
          description="Assignments and paper tests for this class show up here."
          className="rounded-3xl py-14"
        />
      ) : (
        <div className="space-y-10 compact:space-y-8">
          {TOPICS.map((topic) => {
            const topicRows = sorted.filter((row) => (row.kind === "TEST") === topic.isTest);
            if (topicRows.length === 0) return null;
            return (
              <section key={topic.key} aria-labelledby={`classwork-${topic.key}`}>
                <div className="mb-2 flex items-end justify-between gap-4 border-b-[3px] border-primary pb-2">
                  <h2
                    id={`classwork-${topic.key}`}
                    className="font-display text-[1.5rem] leading-tight font-extrabold tracking-[-0.02em] text-foreground sm:text-[1.75rem]"
                  >
                    {topic.title}
                  </h2>
                  <span className="tabular shrink-0 pb-1 text-[0.8125rem] font-medium text-muted-foreground">
                    {pluralize(topicRows.length, topic.noun)}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {topicRows.map((row) => (
                    <li key={row.id}>
                      <ClassworkRow row={row} classColor={classColor} now={now} timeZone={timeZone} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClassworkRow({
  row,
  classColor,
  now,
  timeZone,
}: {
  row: StudentWorkRow;
  classColor: string;
  now: Date;
  timeZone?: string;
}) {
  const status = workStatus(row);
  const score = scoreText(row);
  const isTest = row.kind === "TEST";
  // A paper test waiting for its scan is with the teacher, so it doesn't count down either.
  const open = (row.state === "not_submitted" || row.state === "returned") && !row.awaitingScan;
  const due = dueWhen(row, now, timeZone);
  // Open work counts down; finished work just keeps its date.
  const dueLine = open
    ? dueWhenText(due)
    : due.absolute
      ? `${isTest ? "Test day" : "Due"} ${due.absolute}`
      : due.relative;
  const unscannedTest = isTest && row.state === "not_submitted" && !row.awaitingScan;

  return (
    <Link
      href={`/student/assignments/${encodeURIComponent(row.id)}`}
      className="group flex min-h-row-min items-center gap-4 rounded-2xl px-3 py-row transition-colors outline-none hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset sm:px-4 motion-reduce:transition-none"
    >
      <AssignmentIcon isTest={isTest} color={classColor} className="compact:size-9" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[0.9375rem] leading-6 font-medium break-words text-pretty text-foreground group-hover:underline">
          {row.title}
        </span>
        <span className="tabular block text-[0.8125rem] leading-5 text-pretty text-muted-foreground">
          {dueLine}
          <span className="max-sm:hidden">
            <span aria-hidden> · </span>
            {unscannedTest ? PAPER_TEST_NOTE : `Posted ${formatDate(row.postedAt, timeZone)}`}
          </span>
        </span>
      </span>
      <span className="flex max-w-[45%] shrink-0 flex-col items-end gap-1 text-right">
        {score ? (
          <span className="tabular text-[0.9375rem] leading-5 font-semibold text-foreground">
            <span className="sr-only">Score: </span>
            {score}
          </span>
        ) : null}
        <WorkStatusChip status={status} />
      </span>
    </Link>
  );
}
