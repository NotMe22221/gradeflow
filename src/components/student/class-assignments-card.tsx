import Link from "next/link";
import { ArrowRight, ChevronRight, FileText } from "lucide-react";

import { StudentStateBadge } from "@/components/student/student-state-badge";
import { STUDENT_STATE_DISPLAY, type StudentAssignmentState } from "@/components/student/student-status";
import { Card } from "@/components/ui/card";
import { formatDate, formatScore, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

export type StudentAssignmentRow = {
  id: string;
  title: string;
  dueDate: Date | null;
  pastDue: boolean;
  state: StudentAssignmentState;
  /** Only present once a grade is published. */
  score: { total: number; max: number } | null;
};

export type StudentClassGroup = {
  id: string;
  name: string;
  /** Section and subject, e.g. "Period 2 · English". */
  meta: string | null;
  teacherName: string;
  assignments: StudentAssignmentRow[];
};

/** One class and its assignments, each row showing this student's status. */
export function ClassAssignmentsCard({ group }: { group: StudentClassGroup }) {
  const headingId = `class-${group.id}`;
  return (
    <section aria-labelledby={headingId}>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-border px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={headingId} className="truncate text-base font-semibold tracking-tight text-foreground">
              {group.name}
            </h2>
            <p className="truncate text-sm text-muted-foreground">
              {[group.meta, group.teacherName].filter(Boolean).join(" · ")}
            </p>
          </div>
          <span className="tabular pt-0.5 text-[13px] text-muted-foreground">
            {pluralize(group.assignments.length, "assignment")}
          </span>
        </div>

        {group.assignments.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
            Your teacher hasn&apos;t posted an assignment in this class yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {group.assignments.map((row) => (
              <li key={row.id}>
                <AssignmentRowLink row={row} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

function AssignmentRowLink({ row }: { row: StudentAssignmentRow }) {
  const needsAction = row.state === "not_submitted" || row.state === "returned";
  return (
    <Link
      href={`/student/assignments/${row.id}`}
      className="group flex items-center gap-3 px-4 py-4 transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset sm:gap-4 sm:px-6"
    >
      <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground ring-1 ring-border sm:flex">
        <FileText className="size-4" aria-hidden />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{row.title}</span>
        <span className="mt-0.5 block text-[13px] text-muted-foreground">
          {row.dueDate ? <span className="tabular">Due {formatDate(row.dueDate)}</span> : "No due date"}
          {row.pastDue && row.state === "not_submitted" ? (
            <span className="font-medium text-danger-soft-foreground"> · Past due</span>
          ) : null}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
        <StudentStateBadge state={row.state} />
        <RowDetail row={row} />
      </span>

      <ChevronRight
        className={cn(
          "size-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5",
          // The "Submit" cue already carries an arrow; keep the column width so rows align.
          needsAction && "invisible"
        )}
        aria-hidden
      />
    </Link>
  );
}

function RowDetail({ row }: { row: StudentAssignmentRow }) {
  if (row.state === "graded" && row.score) {
    return (
      <span className="tabular text-sm font-semibold text-foreground sm:min-w-16 sm:text-right">
        <span className="sr-only">Score: </span>
        {formatScore(row.score.total, row.score.max)}
      </span>
    );
  }
  if (row.state === "not_submitted" || row.state === "returned") {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-medium text-primary sm:min-w-16 sm:justify-end">
        {row.state === "returned" ? "Resubmit" : "Submit"}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground sm:min-w-16 sm:text-right">
      {STUDENT_STATE_DISPLAY[row.state].hint}
    </span>
  );
}
