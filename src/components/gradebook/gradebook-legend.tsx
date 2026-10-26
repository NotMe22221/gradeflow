import { PenLine } from "@/components/icons";

import { CELL_DISPLAY, LEGEND_KEYS } from "@/components/gradebook/cell-display";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Explains the cells, rendered from the same CELL_DISPLAY map the cells use.
 * Averages count approved grades only.
 */
export function GradebookLegend({ className }: { className?: string }) {
  return (
    <ul
      aria-label="Grades legend"
      className={cn("flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground", className)}
    >
      {LEGEND_KEYS.map((key) => {
        const display = CELL_DISPLAY[key];
        const look = display.look;
        return (
          <li key={key} className="flex items-center gap-2">
            {key === "published" ? (
              <span className="tabular text-foreground" aria-hidden>
                21<span className="text-muted-foreground">/25</span>
              </span>
            ) : look.kind === "chip" ? (
              <Badge variant={look.variant}>
                {key === "in_review" ? <PenLine aria-hidden /> : null}
                {display.label}
              </Badge>
            ) : look.kind === "danger" ? (
              <span className="font-medium text-danger">{display.label}</span>
            ) : look.kind === "muted" ? (
              <span className="text-foreground/80">{display.label}</span>
            ) : (
              <span className="font-medium text-foreground" aria-hidden>
                –
              </span>
            )}
            <span>{display.legend}</span>
          </li>
        );
      })}
    </ul>
  );
}
