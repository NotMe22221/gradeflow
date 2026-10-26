import Link from "next/link";
import { ClipboardList, SquareUserRound } from "@/components/icons";

import { AssignmentIcon } from "@/components/classwork/assignment-icon";
import { EmptyState } from "@/components/empty-state";
import {
  PAPER_TEST_NOTE,
  relativeDue,
  scoreText,
  WORK_TONE_CLASS,
  workStatus,
  type StudentWorkRow,
} from "@/components/student/todo-model";
import { Button } from "@/components/ui/button";
import { formatDate, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

/** "Posted Oct 20", in the viewer's zone. */
function postedLabel(row: StudentWorkRow, timeZone: string | undefined): string {
  return `Posted ${formatDate(row.postedAt, timeZone)}`;
}

/**
 * A class's Classwork as the student sees it: every assignment, newest first,
 * with this student's own status (Assigned, Missing, Turned in, Returned with
 * the grade). Paper tests say the teacher scans them.
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
    <div className="space-y-6">
      <h1 className="sr-only">Classwork</h1>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="tonal">
          <Link href={`/student/todo?class=${encodeURIComponent(classId)}`}>
            <SquareUserRound aria-hidden />
            View your work
          </Link>
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Your teacher hasn't posted any classwork yet."
          description="Assignments and paper tests for this class show up here."
          className="rounded-xl py-14"
        />
      ) : (
        <section
          aria-labelledby="classwork-list-heading"
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <h2 id="classwork-list-heading" className="sr-only">
            {pluralize(sorted.length, "assignment")}
          </h2>
          <ul className="divide-y divide-border">
            {sorted.map((row) => {
              const status = workStatus(row);
              const score = scoreText(row);
              const isTest = row.kind === "TEST";
              const unscannedTest = isTest && row.state === "not_submitted";
              return (
                <li key={row.id}>
                  <Link
                    href={`/student/assignments/${encodeURIComponent(row.id)}`}
                    className="group flex min-h-[72px] items-center gap-4 px-4 py-3 transition-colors outline-none hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset sm:px-5"
                  >
                    <AssignmentIcon isTest={isTest} color={classColor} />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium break-words text-pretty text-foreground group-hover:underline">
                        {row.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        <span className="tabular">{relativeDue(row, now, timeZone)}</span>
                        <span aria-hidden> · </span>
                        <span className="tabular">{postedLabel(row, timeZone)}</span>
                      </span>
                    </span>
                    <span className="flex max-w-[45%] shrink-0 flex-col items-end gap-0.5 text-right">
                      {score ? (
                        <span className="tabular text-sm font-medium text-foreground">
                          <span className="sr-only">Score: </span>
                          {score}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "text-xs font-medium",
                          unscannedTest ? "font-normal text-muted-foreground" : WORK_TONE_CLASS[status.tone]
                        )}
                      >
                        {unscannedTest && !row.awaitingScan ? PAPER_TEST_NOTE : status.label}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
