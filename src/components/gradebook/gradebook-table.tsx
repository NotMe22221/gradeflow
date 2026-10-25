import Link from "next/link";

import { formatAverage, GradebookCellView } from "@/components/gradebook/gradebook-cell";
import { Avatar } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatPoints } from "@/lib/format";
import type { GradebookData } from "@/lib/gradebook/types";
import { studentProfileHref } from "@/lib/insights/links";
import { cn } from "@/lib/utils";

/*
 * The table uses the separate border model so the sticky first column keeps
 * its borders while the rest scrolls horizontally underneath it. Sticky cells
 * carry solid backgrounds (card / background) that match their row's state.
 *
 * Widths are sized so the Student column, three to four assignment columns,
 * and Average fit a 1280-1440px laptop without scrolling: assignment titles
 * wrap to two lines in a 160px column (wide enough that "Persuasive Essay:
 * Should" fits the first line, so titles sharing a prefix still differ on the
 * second) and the full title is in the tooltip. With more columns the table
 * scrolls, and from lg up the Average column stays pinned to the right edge.
 */
const stickyCell =
  "sticky left-0 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border after:content-['']";

const stickyEndCell =
  "lg:sticky lg:right-0 lg:z-10 lg:before:pointer-events-none lg:before:absolute lg:before:inset-y-0 lg:before:left-0 lg:before:w-px lg:before:bg-border lg:before:content-['']";

export function GradebookTable({ data }: { data: GradebookData }) {
  return (
    <>
      {/* On phones only the Student column and one assignment fit; nothing else hints that the rest scrolls. */}
      <p className="px-6 pt-3 pb-2 text-xs text-muted-foreground sm:hidden">
        Swipe sideways to see every assignment and the average.
      </p>
      <Table className="border-separate border-spacing-0" aria-label={`Gradebook for ${data.class.name}`}>
        <TableHeader className="[&_tr]:border-0">
          <TableRow className="hover:bg-transparent">
            <TableHead
              scope="col"
              className={cn(stickyCell, "z-20 h-auto min-w-40 border-b bg-card py-3 pl-6 align-bottom sm:min-w-56")}
            >
              Student
            </TableHead>
            {data.assignments.map((assignment) => (
              <TableHead key={assignment.id} scope="col" className="h-auto min-w-46 border-b px-3 py-3 align-bottom">
                <Link
                  href={`/assignments/${encodeURIComponent(assignment.id)}`}
                  title={assignment.dueDate ? `${assignment.title} · due ${formatDate(assignment.dueDate)}` : assignment.title}
                  className="line-clamp-2 max-w-40 rounded-sm font-medium break-words whitespace-normal text-foreground outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  {assignment.title}
                </Link>
                <span className="tabular mt-0.5 block font-normal text-muted-foreground">
                  <span aria-hidden>/{formatPoints(assignment.maxScore)}</span>
                  <span className="sr-only">out of {formatPoints(assignment.maxScore)} points</span>
                </span>
              </TableHead>
            ))}
            <TableHead
              scope="col"
              className={cn(stickyEndCell, "h-auto min-w-24 border-b bg-card py-3 pr-6 text-right align-bottom")}
            >
              <span className="font-medium text-foreground">Average</span>
              <span className="mt-0.5 block font-normal text-muted-foreground">Published</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.rows.map((row) => (
            <TableRow key={row.student.id} className="group hover:bg-background">
              <TableHead
                scope="row"
                className={cn(
                  stickyCell,
                  "z-10 h-auto border-b bg-card py-3 pl-6 font-normal text-foreground group-hover:bg-background"
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={row.student.name} className="hidden size-7 text-[11px] sm:inline-flex" />
                  <div className="min-w-0">
                    <Link
                      href={studentProfileHref(data.class.id, row.student.id)}
                      title={`${row.student.name}: profile and conference brief`}
                      className="block max-w-[16rem] truncate rounded-sm text-sm font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                    >
                      {row.student.name}
                    </Link>
                    <div className="hidden max-w-[16rem] truncate text-xs font-normal text-muted-foreground sm:block" title={row.student.email}>
                      {row.student.email}
                    </div>
                  </div>
                </div>
              </TableHead>
              {row.cells.map((cell, index) => (
                <TableCell key={cell.assignmentId} className="border-b px-3">
                  <GradebookCellView
                    cell={cell}
                    studentName={row.student.name}
                    assignmentTitle={data.assignments[index]?.title ?? "this assignment"}
                  />
                </TableCell>
              ))}
              <TableCell
                className={cn(
                  stickyEndCell,
                  "tabular border-b bg-card pr-6 text-right font-semibold text-foreground group-hover:bg-background"
                )}
              >
                {formatAverage(row.averagePercent)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>

        <tfoot>
          <tr className="bg-background">
            <th
              scope="row"
              className={cn(stickyCell, "z-10 bg-background py-3 pl-6 text-left text-xs font-medium text-muted-foreground")}
            >
              Class average
            </th>
            {data.assignments.map((assignment) => (
              <td key={assignment.id} className="tabular px-3 py-3 text-sm font-medium text-foreground">
                {formatAverage(data.assignmentAverages[assignment.id] ?? null)}
              </td>
            ))}
            <td
              className={cn(stickyEndCell, "tabular bg-background py-3 pr-6 pl-4 text-right text-sm font-semibold text-foreground")}
            >
              {formatAverage(data.classAverage)}
            </td>
          </tr>
        </tfoot>
      </Table>
    </>
  );
}
