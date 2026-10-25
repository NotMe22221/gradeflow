import Link from "next/link";

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
 * for a grade.
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
      const title = "AI draft waiting for your approval. Not counted until you publish it.";
      if (!cell.submissionId) {
        return (
          <Badge variant="warning" title={title}>
            In review
          </Badge>
        );
      }
      const href = `/review?assignment=${encodeURIComponent(cell.assignmentId)}&s=${encodeURIComponent(cell.submissionId)}`;
      return (
        <Badge asChild variant="warning" className={cn(pillLink, "hover:brightness-95")}>
          <Link
            href={href}
            title={title}
            aria-label={`In review: ${studentName}, ${assignmentTitle}. Open in the review queue.`}
          >
            In review
          </Link>
        </Badge>
      );
    }
    case "ready":
      return (
        <Badge asChild variant="secondary" className={cn(pillLink, "hover:brightness-95")}>
          <Link
            href={`/assignments/${encodeURIComponent(cell.assignmentId)}`}
            title="Submitted. Run the AI first pass from the assignment page."
            aria-label={`Ready for AI: ${studentName}, ${assignmentTitle}. Open the assignment.`}
          >
            Ready for AI
          </Link>
        </Badge>
      );
    case "grading":
      return (
        <Badge variant="secondary" title="The AI first pass is running.">
          <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" aria-hidden />
          Grading
        </Badge>
      );
    case "returned":
      return (
        <Badge variant="outline" title="Sent back to the student with a note.">
          Sent back
        </Badge>
      );
    case "missing":
      return <NoScore label="No submission yet" />;
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
