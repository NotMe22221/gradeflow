import { HEAT_BANDS, type HeatBand } from "@/lib/insights/heatmap";

/*
 * Sequential heatmap scale built only from the status tokens in globals.css:
 * danger-soft (low) through warning-soft to success-soft (high), with the two
 * ends deepened a little so five steps stay distinguishable. Text always uses
 * the matching -soft-foreground ink, and every cell prints its percent, so
 * color is never the only signal.
 */
export const HEAT_TONE: Record<HeatBand, { cell: string; bar: string; text: string }> = {
  lowest: {
    cell: "bg-[color-mix(in_oklch,var(--danger)_20%,var(--danger-soft))] text-danger-soft-foreground",
    bar: "bg-danger",
    text: "text-danger-soft-foreground",
  },
  low: {
    cell: "bg-danger-soft text-danger-soft-foreground",
    bar: "bg-[color-mix(in_oklch,var(--danger)_70%,var(--warning))]",
    text: "text-danger-soft-foreground",
  },
  mid: {
    cell: "bg-warning-soft text-warning-soft-foreground",
    bar: "bg-warning",
    text: "text-warning-soft-foreground",
  },
  high: {
    cell: "bg-success-soft text-success-soft-foreground",
    bar: "bg-[color-mix(in_oklch,var(--success)_75%,var(--warning))]",
    text: "text-success-soft-foreground",
  },
  highest: {
    cell: "bg-[color-mix(in_oklch,var(--success)_22%,var(--success-soft))] text-success-soft-foreground",
    bar: "bg-success",
    text: "text-success-soft-foreground",
  },
  empty: {
    cell: "bg-muted/60 text-muted-foreground",
    bar: "bg-muted-foreground/40",
    text: "text-muted-foreground",
  },
};

/** Legend entries, low to high, with their swatch classes. */
export const HEAT_LEGEND = HEAT_BANDS.map((band) => ({ ...band, tone: HEAT_TONE[band.key] }));
