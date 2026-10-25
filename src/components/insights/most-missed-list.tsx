import Link from "next/link";

import { HEAT_TONE } from "@/components/insights/heat-tone";
import { formatPoints, pluralize } from "@/lib/format";
import { formatHeatPercent, heatBand, roundPercent, type MostMissedItem } from "@/lib/insights/heatmap";
import { insightsHref } from "@/lib/insights/links";
import { cn } from "@/lib/utils";

/**
 * Ranked list of the criteria a class loses the most points on. Each row
 * links to its assignment (or, with `linkTo="insights"`, to the class
 * heatmap). The bar is the class average; the percent is always printed.
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
                "flex items-center gap-4 transition-colors outline-none hover:bg-background focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset",
                dense ? "px-5 py-3" : "px-6 py-4"
              )}
            >
              <span
                aria-hidden
                className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground ring-1 ring-border"
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground" title={item.title}>
                  {item.title}
                </span>
                <span className="block truncate text-xs text-muted-foreground" title={context}>
                  {context}
                  {dense ? null : <span className="tabular"> · out of {formatPoints(item.maxPoints)}</span>}
                </span>
                <span aria-hidden className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn("block h-full rounded-full", tone.bar)}
                    style={{ width: `${Math.max(2, roundPercent(item.average))}%` }}
                  />
                </span>
              </span>
              <span aria-hidden className="shrink-0 text-right">
                <span className="tabular block text-sm font-semibold text-foreground">{average}</span>
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
