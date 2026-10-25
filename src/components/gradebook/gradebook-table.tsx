import Link from "next/link";

import { formatAverage, GradebookCellView } from "@/components/gradebook/gradebook-cell";
import { Avatar } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatPoints } from "@/lib/format";
import type { GradebookData } from "@/lib/gradebook/types";
import { cn } from "@/lib/utils";

/*
 * The table uses the separate border model so the sticky first column keeps
 * its borders while the rest scrolls horizontally underneath it. Sticky cells
 * carry solid backgrounds (card / background) that match their row's state.
 */
const stickyCell =
  "sticky left-0 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border after:content-['']";

export function GradebookTable({ data }: { data: GradebookData }) {
  return (
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
            <TableHead key={assignment.id} scope="col" className="h-auto min-w-36 border-b py-3 align-bottom">
              <Link
                href={`/assignments/${encodeURIComponent(assignment.id)}`}
                title={assignment.dueDate ? `${assignment.title} · due ${formatDate(assignment.dueDate)}` : assignment.title}
                className="block max-w-44 truncate rounded-sm font-medium text-foreground outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                {assignment.title}
              </Link>
              <span className="tabular mt-0.5 block font-normal text-muted-foreground">
                <span aria-hidden>/{formatPoints(assignment.maxScore)}</span>
                <span className="sr-only">out of {formatPoints(assignment.maxScore)} points</span>
              </span>
            </TableHead>
          ))}
          <TableHead scope="col" className="h-auto min-w-24 border-b py-3 pr-6 text-right align-bottom">
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
                  <div className="max-w-36 truncate text-sm font-medium sm:max-w-48" title={row.student.name}>
                    {row.student.name}
                  </div>
                  <div className="hidden max-w-48 truncate text-xs font-normal text-muted-foreground sm:block">
                    {row.student.email}
                  </div>
                </div>
              </div>
            </TableHead>
            {row.cells.map((cell, index) => (
              <TableCell key={cell.assignmentId} className="border-b">
                <GradebookCellView
                  cell={cell}
                  studentName={row.student.name}
                  assignmentTitle={data.assignments[index]?.title ?? "this assignment"}
                />
              </TableCell>
            ))}
            <TableCell className="tabular border-b pr-6 text-right font-semibold text-foreground">
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
            <td key={assignment.id} className="tabular px-4 py-3 text-sm font-medium text-foreground">
              {formatAverage(data.assignmentAverages[assignment.id] ?? null)}
            </td>
          ))}
          <td className="tabular py-3 pr-6 pl-4 text-right text-sm font-semibold text-foreground">
            {formatAverage(data.classAverage)}
          </td>
        </tr>
      </tfoot>
    </Table>
  );
}
