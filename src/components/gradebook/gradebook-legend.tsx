import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Explains the non-score cells. Averages count published grades only. */
export function GradebookLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground", className)}>
      <span className="flex items-center gap-2">
        <span className="tabular font-medium text-foreground">21/25</span>
        Published with your approval
      </span>
      <span className="flex items-center gap-2">
        <Badge variant="warning">In review</Badge>
        Waiting for your approval
      </span>
      <span className="flex items-center gap-2">
        <Badge variant="secondary">Ready for AI</Badge>
        Submitted, no AI pass yet
      </span>
      <span className="flex items-center gap-2">
        <Badge variant="outline">Sent back</Badge>
        Returned with a note
      </span>
      <span className="flex items-center gap-2">
        <span className="font-medium text-foreground" aria-hidden>
          –
        </span>
        No submission
      </span>
    </div>
  );
}
