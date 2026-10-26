import { cn } from "@/lib/utils";

/** Where an assignment's papers are, bucketed for progress displays. */
export type StatusSummary = {
  review: number;
  ready: number;
  returned: number;
  published: number;
  notSubmitted: number;
  total: number;
};

export function summarizeStatuses(statuses: string[], rosterCount: number): StatusSummary {
  const summary = { review: 0, ready: 0, returned: 0, published: 0, notSubmitted: 0, total: 0 };
  for (const status of statuses) {
    if (status === "NEEDS_REVIEW") summary.review++;
    else if (status === "PUBLISHED" || status === "APPROVED") summary.published++;
    else if (status === "RETURNED") summary.returned++;
    else summary.ready++; // SUBMITTED, GRADING, GRADING_FAILED
  }
  summary.notSubmitted = Math.max(0, rosterCount - statuses.length);
  summary.total = Math.max(rosterCount, statuses.length);
  return summary;
}

/**
 * Google Classroom's three numbers for a piece of work:
 * - turnedIn: papers waiting on the teacher (AI pass or review)
 * - assigned: students the work is waiting on (not turned in, or sent back for a revision)
 * - graded: approved and returned with a grade
 */
export type WorkCounts = { turnedIn: number; assigned: number; graded: number };

export function workCounts(summary: StatusSummary): WorkCounts {
  return {
    turnedIn: summary.review + summary.ready,
    assigned: summary.notSubmitted + summary.returned,
    graded: summary.published,
  };
}

const SEGMENTS: { key: keyof Omit<StatusSummary, "total" | "notSubmitted">; label: string; className: string }[] = [
  { key: "published", label: "graded", className: "bg-success" },
  { key: "review", label: "to review", className: "bg-warning" },
  { key: "ready", label: "ready for AI pass", className: "bg-muted-foreground/45" },
  { key: "returned", label: "sent back", className: "bg-muted-foreground/20" },
];

/** "2 to review · 1 ready for AI pass · 1 graded · 3 not turned in" */
export function describeSummary(summary: StatusSummary): string {
  const parts = [
    summary.review ? `${summary.review} to review` : null,
    summary.ready ? `${summary.ready} ready for AI pass` : null,
    summary.returned ? `${summary.returned} sent back` : null,
    summary.published ? `${summary.published} graded` : null,
    summary.notSubmitted ? `${summary.notSubmitted} not turned in` : null,
  ].filter(Boolean);
  if (summary.total === 0) return "No students enrolled yet";
  return parts.join(" · ");
}

/** Mini stacked bar: graded, to review, ready, sent back, then not turned in. */
export function StatusBar({ summary, className }: { summary: StatusSummary; className?: string }) {
  return (
    <div
      role="img"
      aria-label={describeSummary(summary)}
      className={cn("flex h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      {summary.total > 0
        ? SEGMENTS.map((segment) =>
            summary[segment.key] > 0 ? (
              <span
                key={segment.key}
                className={cn("h-full first:rounded-l-full", segment.className)}
                style={{ width: `${(summary[segment.key] / summary.total) * 100}%` }}
              />
            ) : null
          )
        : null}
    </div>
  );
}
