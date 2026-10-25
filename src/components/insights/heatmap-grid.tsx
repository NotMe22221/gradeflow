import Link from "next/link";

import { HeatmapScrollRegion } from "@/components/insights/heatmap-scroll";
import { HEAT_TONE } from "@/components/insights/heat-tone";
import { Avatar } from "@/components/ui/avatar";
import { formatPoints, pluralize } from "@/lib/format";
import {
  formatHeatPercent,
  heatBand,
  heatCellLabel,
  type ClassHeatmap,
  type HeatmapColumn,
} from "@/lib/insights/heatmap";
import { studentProfileHref } from "@/lib/insights/links";
import { cn } from "@/lib/utils";

/*
 * Dense class heatmap: one row per enrolled student, one column per rubric
 * criterion or test question, grouped under its assignment. The table uses
 * the separate border model so the sticky Student column keeps its divider
 * while the cells scroll sideways underneath it on narrow screens.
 *
 * The Student column and every criterion column have fixed widths, so the
 * tiles stay a uniform 72px and the Average column absorbs any spare width.
 * Group headers use max-w-0 so a long assignment title wraps inside its
 * columns instead of widening them, and column titles break anywhere
 * (overflow-wrap: anywhere) so one long word ("Interpretation") can't widen
 * its column either. Eleven columns then fit a 1440px laptop.
 *
 * With more columns than fit, the table scrolls inside HeatmapScrollRegion.
 * From sm up the Average column is pinned to the right edge, so every
 * student's average stays in view, and the card header shows scroll buttons.
 * The pinned columns cast a soft shadow while cells are scrolled beneath them.
 */

const stickyCell =
  "sticky left-0 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border after:content-[''] group-data-[more-left=true]/heatmap:shadow-[6px_0_8px_-6px_rgb(0_0_0/0.14)]";

/** The Average column: pinned right from sm up (phones are too narrow to pin two columns). */
const stickyEndCell =
  "sm:sticky sm:right-0 sm:group-data-[more-right=true]/heatmap:shadow-[-6px_0_8px_-6px_rgb(0_0_0/0.14)]";

/** Index of the first column of every group, for the group dividers. */
function groupStarts(heatmap: ClassHeatmap): Set<number> {
  const starts = new Set<number>();
  let index = 0;
  for (const group of heatmap.groups) {
    starts.add(index);
    index += group.columns.length;
  }
  return starts;
}

function columnTooltip(column: HeatmapColumn): string {
  const average =
    column.average === null
      ? "no approved grades yet"
      : `class average ${formatHeatPercent(column.average)} (${pluralize(column.sampleSize, "student")})`;
  return `${column.title} · ${formatPoints(column.maxPoints)} pts · ${average}`;
}

export function HeatmapGrid({ heatmap }: { heatmap: ClassHeatmap }) {
  const classId = heatmap.class.id;
  const starts = groupStarts(heatmap);

  return (
    <HeatmapScrollRegion label={`Heatmap for ${heatmap.class.name}. Scrolls sideways.`}>
      <table className="w-full border-separate border-spacing-0 text-sm">
        <caption className="sr-only">
          Percent of the points each student earned on every rubric criterion, from teacher-approved grades only.
        </caption>
        <thead>
          <tr>
            <th
              rowSpan={2}
              scope="col"
              className={cn(
                stickyCell,
                "z-20 w-36 min-w-36 border-b border-border bg-card py-3 pr-3 pl-4 text-left align-bottom text-xs font-medium text-muted-foreground sm:w-52 sm:min-w-52 sm:pl-6"
              )}
            >
              Student
            </th>
            {heatmap.groups.map((group) => (
              <th
                key={group.assignmentId}
                colSpan={group.columns.length}
                scope="colgroup"
                className="max-w-0 border-b border-l border-border px-2 pt-4 pb-2 text-left align-bottom font-normal"
              >
                <Link
                  href={`/assignments/${encodeURIComponent(group.assignmentId)}`}
                  title={group.title}
                  className="line-clamp-2 rounded-sm text-xs leading-snug font-semibold break-words whitespace-normal text-foreground outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  {group.title}
                </Link>
                <span className="tabular mt-0.5 block truncate text-[11px] text-muted-foreground">
                  Avg {formatHeatPercent(group.average)} · {group.gradedCount} graded
                </span>
              </th>
            ))}
            <th
              rowSpan={2}
              scope="col"
              className={cn(
                stickyEndCell,
                "border-b border-l border-border bg-card py-3 pr-4 pl-3 text-right align-bottom text-xs font-medium whitespace-nowrap text-muted-foreground sm:z-20 sm:pr-6"
              )}
            >
              Average
            </th>
          </tr>
          <tr>
            {heatmap.columns.map((column, index) => (
              <th
                key={column.key}
                scope="col"
                title={columnTooltip(column)}
                className={cn(
                  "w-18 min-w-18 border-b border-border px-1 pt-1 pb-2 text-left align-bottom font-normal",
                  starts.has(index) && "border-l pl-2"
                )}
              >
                <span className="line-clamp-2 text-[11px] leading-tight font-medium whitespace-normal text-foreground [overflow-wrap:anywhere]">
                  {column.title}
                </span>
                <span className="tabular mt-0.5 block text-[10px] text-muted-foreground">
                  <span aria-hidden>/{formatPoints(column.maxPoints)}</span>
                  <span className="sr-only">
                    out of {formatPoints(column.maxPoints)} {column.maxPoints === 1 ? "point" : "points"}
                  </span>
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {heatmap.rows.map((row) => (
            <tr key={row.student.id} className="group">
              <th
                scope="row"
                className={cn(
                  stickyCell,
                  "z-10 bg-card py-0.5 pr-3 pl-4 text-left font-normal group-hover:bg-background sm:pl-6"
                )}
              >
                <Link
                  href={studentProfileHref(classId, row.student.id)}
                  title={`${row.student.name}: profile and conference brief`}
                  className="flex min-w-0 items-center gap-2 rounded-sm py-1 text-sm font-medium text-foreground outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  <Avatar name={row.student.name} className="hidden size-6 text-[10px] sm:inline-flex" />
                  <span className="max-w-[8.5rem] truncate sm:max-w-[13rem]">{row.student.name}</span>
                </Link>
              </th>
              {row.cells.map((value, index) => {
                const column = heatmap.columns[index];
                const label = heatCellLabel(row.student.name, column?.title ?? "this criterion", value);
                return (
                  <td
                    key={column?.key ?? index}
                    aria-label={label}
                    title={label}
                    className={cn("p-0.5", starts.has(index) && "border-l border-border pl-1.5")}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "tabular flex h-8 items-center justify-center rounded-md text-xs font-medium transition-shadow hover:ring-2 hover:ring-foreground/25",
                        HEAT_TONE[heatBand(value)].cell
                      )}
                    >
                      {formatHeatPercent(value)}
                    </span>
                  </td>
                );
              })}
              <td
                className={cn(
                  stickyEndCell,
                  "tabular border-l border-border bg-card py-0.5 pr-4 pl-3 text-right text-sm font-semibold text-foreground group-hover:bg-background sm:z-10 sm:pr-6"
                )}
              >
                {formatHeatPercent(row.average)}
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr>
            <th
              scope="row"
              className={cn(
                stickyCell,
                "z-10 border-t border-border bg-background py-2 pr-3 pl-4 text-left text-xs font-medium text-muted-foreground sm:pl-6"
              )}
            >
              Class average
            </th>
            {heatmap.columns.map((column, index) => (
              <td
                key={column.key}
                title={columnTooltip(column)}
                className={cn(
                  "border-t border-border bg-background px-0.5 py-2 text-center",
                  starts.has(index) && "border-l pl-1.5"
                )}
              >
                <span className={cn("tabular block text-xs font-semibold", HEAT_TONE[heatBand(column.average)].text)}>
                  {formatHeatPercent(column.average)}
                </span>
                <span className="tabular block text-[10px] text-muted-foreground">
                  <span aria-hidden>n={column.sampleSize}</span>
                  <span className="sr-only">{pluralize(column.sampleSize, "student")}</span>
                </span>
              </td>
            ))}
            <td
              className={cn(
                stickyEndCell,
                "tabular border-t border-l border-border bg-background py-2 pr-4 pl-3 text-right text-sm font-semibold text-foreground sm:z-10 sm:pr-6"
              )}
            >
              {formatHeatPercent(heatmap.classAverage)}
            </td>
          </tr>
        </tfoot>
      </table>
    </HeatmapScrollRegion>
  );
}
