import { CELL_DISPLAY, LEGEND_STATES } from "@/components/gradebook/cell-display";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Explains the cells, rendered from the same CELL_DISPLAY map the cells use.
 * Averages count published grades only.
 */
export function GradebookLegend({ className }: { className?: string }) {
  return (
    <ul
      aria-label="Gradebook legend"
      className={cn("flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground", className)}
    >
      {LEGEND_STATES.map((state) => {
        const display = CELL_DISPLAY[state];
        return (
          <li key={state} className="flex items-center gap-2">
            {state === "published" ? (
              <span className="tabular font-medium text-foreground" aria-hidden>
                21/25
              </span>
            ) : display.variant ? (
              <Badge variant={display.variant}>{display.label}</Badge>
            ) : (
              <span className="font-medium text-foreground" aria-hidden>
                –
              </span>
            )}
            {display.legend}
          </li>
        );
      })}
    </ul>
  );
}
