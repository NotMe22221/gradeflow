import Link from "next/link";

import { CELL_DISPLAY } from "@/components/gradebook/cell-display";
import { Badge } from "@/components/ui/badge";
import { formatPercent, formatScore } from "@/lib/format";
import type { GradebookCell } from "@/lib/gradebook/types";
import { cn } from "@/lib/utils";

/** "84%" for an average, "–" when nothing is published yet. */
export function formatAverage(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "–" : `${Math.round(value)}%`;
}

const pillLink =
  "outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring";

/**
 * One gradebook cell. Only published cells show a score; every other state
 * is a workflow label, so an unapproved AI suggestion can never be mistaken
 * for a grade. Labels, badge styles, and hover text come from CELL_DISPLAY,
 * which the legend renders from too.
 */
export function GradebookCellView({
  cell,
  studentName,
  assignmentTitle,
}: {
  cell: GradebookCell;
  studentName: string;
  assignmentTitle: string;
}) {
  const display = CELL_DISPLAY[cell.state];
  const variant = display.variant ?? "secondary";

  switch (cell.state) {
    case "published": {
      if (cell.score === null) return <NoScore label="No published score" />;
      return (
        <span className="inline-flex items-baseline gap-1.5">
          <span className="tabular font-medium text-foreground">{formatScore(cell.score, cell.maxScore)}</span>
          <span className="tabular text-xs text-muted-foreground">{formatPercent(cell.score, cell.maxScore)}</span>
        </span>
      );
    }
    case "in_review": {
      if (!cell.submissionId) {
        return (
          <Badge variant={variant} title={display.hint}>
            {display.label}
          </Badge>
        );
      }
      const href = `/review?assignment=${encodeURIComponent(cell.assignmentId)}&s=${encodeURIComponent(cell.submissionId)}`;
      return (
        <Badge asChild variant={variant} className={cn(pillLink, "hover:brightness-95")}>
          <Link
            href={href}
            title={display.hint}
            aria-label={`${display.label}: ${studentName}, ${assignmentTitle}. Open in the review queue.`}
          >
            {display.label}
          </Link>
        </Badge>
      );
    }
    case "ready":
      return (
        <Badge asChild variant={variant} className={cn(pillLink, "hover:brightness-95")}>
          <Link
            href={`/assignments/${encodeURIComponent(cell.assignmentId)}`}
            title={display.hint}
            aria-label={`${display.label}: ${studentName}, ${assignmentTitle}. Open the assignment.`}
          >
            {display.label}
          </Link>
        </Badge>
      );
    case "grading":
      return (
        <Badge variant={variant} title={display.hint}>
          <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" aria-hidden />
          {display.label}
        </Badge>
      );
    case "returned":
      return (
        <Badge variant={variant} title={display.hint}>
          {display.label}
        </Badge>
      );
    case "missing":
      return <NoScore label={display.label} />;
  }
}

function NoScore({ label }: { label: string }) {
  return (
    <span className="text-muted-foreground" title={label}>
      <span aria-hidden>–</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
