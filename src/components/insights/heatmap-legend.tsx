import { HEAT_LEGEND, HEAT_TONE } from "@/components/insights/heat-tone";
import { cn } from "@/lib/utils";

/** The heatmap color scale, low to high, plus the empty-cell marker. */
export function HeatmapLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground", className)}>
      <div className="flex items-center gap-3">
        <span className="font-medium text-foreground">Points earned</span>
        <ul aria-label="Heatmap color scale, low to high" className="flex items-center gap-1">
          {HEAT_LEGEND.map((band) => (
            <li key={band.key} className="flex flex-col items-center gap-1">
              <span
                aria-hidden
                className={cn("block h-3 w-9 rounded-sm ring-1 ring-black/5 ring-inset sm:w-11", band.tone.cell)}
              />
              <span className="tabular text-[0.6875rem] leading-none whitespace-nowrap">{band.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn("flex h-5 w-8 items-center justify-center rounded-sm text-[0.6875rem]", HEAT_TONE.empty.cell)}
        >
          –
        </span>
        No approved grade yet
      </div>
    </div>
  );
}
