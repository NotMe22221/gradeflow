import type { WorkCounts as Counts } from "@/components/classes/status-summary";
import { cn } from "@/lib/utils";

/** Labels for the three numbers. A paper test is never "turned in" by the student: the teacher scans it. */
export function workCountLabels(isTest: boolean): Record<keyof Counts, string> {
  return isTest
    ? { turnedIn: "Scanned", assigned: "Not scanned", graded: "Graded" }
    : { turnedIn: "Turned in", assigned: "Assigned", graded: "Graded" };
}

const ORDER: (keyof Counts)[] = ["turnedIn", "assigned", "graded"];

/**
 * Classroom's big "Turned in | Assigned | Graded" numbers, divided by thin
 * rules. A description list, so screen readers hear "Turned in, 4".
 */
export function WorkCounts({
  counts,
  isTest = false,
  size = "default",
  className,
}: {
  counts: Counts;
  isTest?: boolean;
  /** "lg" for the assignment page header, default for compact places. */
  size?: "default" | "lg";
  className?: string;
}) {
  const labels = workCountLabels(isTest);
  return (
    <dl className={cn("flex items-stretch", className)}>
      {ORDER.map((key) => (
        <div
          key={key}
          className={cn(
            "flex flex-col-reverse justify-end gap-1 border-l border-border first:border-l-0 first:pl-0",
            size === "lg" ? "px-5 sm:px-7" : "px-4 sm:px-5"
          )}
        >
          <dt className="text-[13px] whitespace-nowrap text-muted-foreground">{labels[key]}</dt>
          <dd
            className={cn(
              "tabular font-display leading-none font-normal text-foreground",
              size === "lg" ? "text-[34px] sm:text-[40px]" : "text-[28px]"
            )}
          >
            {counts[key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
