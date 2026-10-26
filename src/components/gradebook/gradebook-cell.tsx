import Link from "next/link";

import { CELL_DISPLAY, cellDisplayKey } from "@/components/gradebook/cell-display";
import { Badge } from "@/components/ui/badge";
import { formatPercent, formatPoints } from "@/lib/format";
import type { GradebookCell } from "@/lib/gradebook/types";

/** "84%" for an average, "–" when nothing is approved yet. */
export function formatAverage(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "–" : `${Math.round(value)}%`;
}

const focusRing = "rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring";

/**
 * One Grades cell, in Google Classroom's style. Only an approved (published)
 * grade shows a score. Every other state is a word ("Needs review",
 * "Turned in", "Missing"), so an unapproved AI suggestion can never be
 * mistaken for a grade. Labels and hover text come from CELL_DISPLAY, which
 * the legend renders from too.
 */
export function GradebookCellView({
  cell,
  studentName,
  assignmentTitle,
  pastDue = false,
  isTest = false,
}: {
  cell: GradebookCell;
  studentName: string;
  assignmentTitle: string;
  /** The assignment's due day has ended (turns an empty cell into "Missing"). */
  pastDue?: boolean;
  /** Paper tests are scanned by the teacher, so an unscanned one is never "Missing". */
  isTest?: boolean;
}) {
  const key = cellDisplayKey(cell.state, { pastDue, isTest });
  const display = CELL_DISPLAY[key];

  switch (key) {
    case "published": {
      if (cell.score === null) return <Blank label="No approved score" />;
      return (
        <span className="tabular inline-flex items-baseline" title={`${formatPercent(cell.score, cell.maxScore)} · ${display.hint}`}>
          <span className="text-sm text-foreground">{formatPoints(cell.score)}</span>
          <span className="text-xs text-muted-foreground">/{formatPoints(cell.maxScore)}</span>
          <span className="sr-only">, {display.label.toLowerCase()}</span>
        </span>
      );
    }
    case "in_review": {
      if (!cell.submissionId) {
        return (
          <Badge variant="warning" title={display.hint}>
            {display.label}
          </Badge>
        );
      }
      const href = `/review?assignment=${encodeURIComponent(cell.assignmentId)}&s=${encodeURIComponent(cell.submissionId)}`;
      return (
        <Badge asChild variant="warning" className={`${focusRing} hover:brightness-95`}>
          <Link
            href={href}
            title={display.hint}
            aria-label={`${display.label}: ${studentName}, ${assignmentTitle}. Open in To review.`}
          >
            {display.label}
          </Link>
        </Badge>
      );
    }
    case "ready":
      return (
        <Link
          href={`/assignments/${encodeURIComponent(cell.assignmentId)}`}
          title={display.hint}
          aria-label={`${display.label}: ${studentName}, ${assignmentTitle}. Open the assignment to run the AI pass.`}
          className={`${focusRing} text-[13px] text-muted-foreground hover:text-foreground hover:underline`}
        >
          {display.label}
        </Link>
      );
    case "grading":
      return (
        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground" title={display.hint}>
          <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
          {display.label}
        </span>
      );
    case "returned":
      return (
        <span className="text-[13px] text-muted-foreground" title={display.hint}>
          {display.label}
        </span>
      );
    case "missing_past_due":
      return (
        <span className="text-[13px] font-medium text-danger" title={display.hint}>
          {display.label}
        </span>
      );
    case "missing":
      return <Blank label={isTest ? "Not scanned yet" : display.label} />;
  }
}

function Blank({ label }: { label: string }) {
  return (
    <span className="text-muted-foreground/70" title={label}>
      <span aria-hidden>–</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
