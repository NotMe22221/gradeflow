import Link from "next/link";

import { isPastDueDay } from "@/components/classwork/due";
import { formatAverage, GradebookCellView } from "@/components/gradebook/gradebook-cell";
import { Avatar } from "@/components/ui/avatar";
import type { AssignmentKind } from "@/lib/constants";
import { formatDate, formatPoints } from "@/lib/format";
import type { GradebookData } from "@/lib/gradebook/types";
import { studentProfileHref } from "@/lib/insights/links";
import { cn } from "@/lib/utils";

/*
 * Google Classroom's Grades grid. Students are rows (sticky on the left), the
 * average sits beside the names, and each assignment is a column headed by
 * its due date, title, and "out of N". The table uses the separate border
 * model so the sticky first column keeps its borders while the rest scrolls
 * horizontally underneath it; sticky cells carry solid backgrounds that match
 * their row.
 */
const stickyCell =
  "sticky left-0 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border after:content-['']";

export function GradebookTable({
  data,
  kinds = {},
  now = new Date(),
}: {
  data: GradebookData;
  /** Assignment kinds by id. A paper test that is not scanned yet is never shown as "Missing". */
  kinds?: Record<string, AssignmentKind>;
  /** For past-due checks (injectable for previews and tests). */
  now?: Date;
}) {
  const columns = data.assignments.map((assignment) => ({
    ...assignment,
    isTest: kinds[assignment.id] === "TEST",
    pastDue: isPastDueDay(assignment.dueDate, now),
  }));

  return (
    <div className="min-w-0">
      {/* On phones only the names and one or two columns fit; nothing else hints that the rest scrolls. */}
      <p className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground sm:hidden">
        Swipe sideways to see every assignment.
      </p>
      <div className="relative w-full overflow-x-auto">
        <table
          className="w-full border-separate border-spacing-0 text-sm"
          aria-label={`Grades for ${data.class.name}`}
        >
          <thead>
            <tr>
              <th
                scope="col"
                className={cn(
                  stickyCell,
                  "z-20 min-w-40 border-b border-border bg-card px-4 py-3 text-left align-bottom text-xs font-medium text-muted-foreground sm:min-w-60 sm:pl-6"
                )}
              >
                Students
              </th>
              <th
                scope="col"
                className="min-w-28 border-b border-l border-border bg-card px-4 py-3 text-left align-bottom font-normal"
              >
                <span className="block text-xs text-muted-foreground">Approved grades</span>
                <span className="mt-1 block text-sm font-medium text-foreground">Average</span>
              </th>
              {columns.map((assignment) => (
                <th
                  key={assignment.id}
                  scope="col"
                  className="w-44 min-w-44 border-b border-l border-border bg-card px-4 py-3 text-left align-bottom font-normal"
                >
                  <span className="block text-xs text-muted-foreground">
                    {assignment.dueDate ? `Due ${formatDate(assignment.dueDate)}` : "No due date"}
                  </span>
                  <Link
                    href={`/assignments/${encodeURIComponent(assignment.id)}`}
                    title={assignment.title}
                    className="mt-1 line-clamp-2 rounded-sm text-sm leading-snug font-medium break-words text-foreground outline-none hover:text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                  >
                    {assignment.title}
                  </Link>
                  <span className="tabular mt-1 block text-xs text-muted-foreground">
                    out of {formatPoints(assignment.maxScore)}
                    {assignment.isTest ? " · Paper test" : ""}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            <tr>
              <th
                scope="row"
                className={cn(
                  stickyCell,
                  "z-10 h-12 border-b border-border bg-background px-4 text-left text-[13px] font-medium text-foreground sm:pl-6"
                )}
              >
                Class average
              </th>
              <td className="tabular h-12 border-b border-l border-border bg-background px-4 text-sm font-medium text-foreground">
                {formatAverage(data.classAverage)}
              </td>
              {columns.map((assignment) => (
                <td
                  key={assignment.id}
                  className="tabular h-12 border-b border-l border-border bg-background px-4 text-sm text-foreground"
                >
                  {formatAverage(data.assignmentAverages[assignment.id] ?? null)}
                </td>
              ))}
            </tr>

            {data.rows.map((row) => (
              <tr key={row.student.id} className="group">
                <th
                  scope="row"
                  className={cn(
                    stickyCell,
                    "z-10 h-14 border-b border-border bg-card px-4 text-left font-normal group-last:border-b-0 group-hover:bg-background sm:pl-6"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={row.student.name} className="hidden sm:inline-flex" />
                    <Link
                      href={studentProfileHref(data.class.id, row.student.id)}
                      title={`${row.student.name} (${row.student.email}): profile and conference brief`}
                      className="block max-w-[14rem] truncate rounded-sm text-sm font-medium text-foreground outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                    >
                      {row.student.name}
                    </Link>
                  </div>
                </th>
                <td className="tabular h-14 border-b border-l border-border bg-card px-4 text-sm font-medium text-foreground group-last:border-b-0 group-hover:bg-background">
                  {formatAverage(row.averagePercent)}
                </td>
                {row.cells.map((cell, index) => {
                  const column = columns[index];
                  return (
                    <td
                      key={cell.assignmentId}
                      className="h-14 border-b border-l border-border bg-card px-4 group-last:border-b-0 group-hover:bg-background"
                    >
                      <GradebookCellView
                        cell={cell}
                        studentName={row.student.name}
                        assignmentTitle={column?.title ?? "this assignment"}
                        pastDue={column?.pastDue ?? false}
                        isTest={column?.isTest ?? false}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
