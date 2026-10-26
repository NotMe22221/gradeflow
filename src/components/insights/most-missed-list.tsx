import Link from "next/link";

import { ClassAvatar } from "@/components/classroom/class-avatar";
import { HEAT_TONE } from "@/components/insights/heat-tone";
import { formatPoints, pluralize } from "@/lib/format";
import { formatHeatPercent, heatBand, roundPercent, type MostMissedItem } from "@/lib/insights/heatmap";
import { insightsHref } from "@/lib/insights/links";
import { cn } from "@/lib/utils";

/**
 * Ranked list of the criteria a class loses the most points on, as
 * Classroom-style rows: a neutral tonal circle holding the rank, the
 * criterion and where it was asked, and the class average on the right. Each
 * row links to its assignment (or, with `linkTo="insights"`, to the class
 * heatmap). The bar is the class average; the percent is always printed.
 *
 * `dense` is for a narrow rail (the dashboard): a smaller circle, the
 * question wraps to two lines, and the assignment and class get a line each,
 * so the row still says what was missed and where.
 *
 * Class colors stay on the small class avatar: on the rank circle a green
 * class would read as "good" next to the lowest score on the page.
 */
export function MostMissedList({
  items,
  showClass = false,
  linkTo = "assignment",
  dense = false,
  className,
}: {
  items: MostMissedItem[];
  /** Show the class name (the dashboard ranks across classes). */
  showClass?: boolean;
  linkTo?: "assignment" | "insights";
  dense?: boolean;
  className?: string;
}) {
  return (
    <ol className={cn("divide-y divide-border", className)}>
      {items.map((item, index) => {
        const href =
          linkTo === "insights"
            ? insightsHref(item.classId)
            : `/assignments/${encodeURIComponent(item.assignmentId)}`;
        const context = showClass ? `${item.assignmentTitle} · ${item.className}` : item.assignmentTitle;
        const average = formatHeatPercent(item.average);
        const tone = HEAT_TONE[heatBand(item.average)];
        return (
          <li key={item.key}>
            <Link
              href={href}
              aria-label={`${index + 1}. ${item.title}, ${context}: class average ${average} across ${pluralize(item.sampleSize, "student")}`}
              className={cn(
                "flex items-center transition-colors outline-none hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset",
                dense ? "gap-3 px-5 py-3" : "gap-4 px-4 py-3.5 sm:px-6"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "tabular flex shrink-0 items-center justify-center self-start rounded-full bg-primary-soft font-medium text-primary-soft-foreground",
                  dense ? "mt-0.5 size-8 text-[0.8125rem]" : "size-10 text-sm"
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-sm font-medium text-foreground",
                    dense ? "line-clamp-2 [overflow-wrap:anywhere]" : "line-clamp-2 [overflow-wrap:anywhere] sm:line-clamp-1"
                  )}
                  title={item.title}
                >
                  {item.title}
                </span>
                {dense ? (
                  <>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground" title={item.assignmentTitle}>
                      {item.assignmentTitle}
                    </span>
                    {showClass ? (
                      <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground" title={item.className}>
                        <ClassAvatar name={item.className} className="size-4 text-[0.5625rem]" />
                        <span className="truncate">{item.className}</span>
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground" title={context}>
                    {context}
                    <span className="tabular"> · out of {formatPoints(item.maxPoints)}</span>
                  </span>
                )}
                <span aria-hidden className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <span
                    className={cn("block h-full rounded-full", tone.bar)}
                    style={{ width: `${Math.max(2, roundPercent(item.average))}%` }}
                  />
                </span>
              </span>
              <span aria-hidden className="shrink-0 self-start text-right">
                <span className="tabular block font-display text-base leading-6 font-medium text-foreground">
                  {average}
                </span>
                <span className="tabular block text-xs whitespace-nowrap text-muted-foreground">
                  {pluralize(item.sampleSize, "student")}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
