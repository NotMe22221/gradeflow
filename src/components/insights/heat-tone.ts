import { HEAT_BANDS, type HeatBand } from "@/lib/insights/heatmap";

/*
 * The heatmap scale: diverging orange <-> blue around a neutral middle band.
 *
 *   Below 50%  50–64%  65–79%   80–89%  90–100%
 *   orange     light   neutral  light   blue
 *              orange           blue
 *
 * Why these hues: orange and blue stay apart under red-green color blindness
 * (the old red-to-green scale did not), the neutral middle reads as "nothing
 * to act on", and the two strong ends are the cells worth a second look.
 * Steps get lighter toward the middle in both themes, so the scale also reads
 * as lightness alone.
 *
 * Every tone is mixed from theme tokens, never fixed colors: the fixed class
 * hues (--class-orange-accent, --class-blue-accent; tone 40 in light, tone 80
 * in dark, and they don't follow the accent preference) blended into the card
 * surface. The orange arm is warmed with --warning-soft so it reads as orange,
 * not tan. Dark mode therefore gets its own darker, quieter steps, not an
 * inverted light scale. Cell text is always text-foreground (8.9:1 or more in
 * light, 4.5:1 or more in dark; tests/review-insights.test.ts recomputes this
 * from globals.css), and every cell prints its percent, so color is never the
 * only signal.
 *
 * `cell` fills a value tile or chip, `bar` fills a progress bar or legend dot
 * on the bg-secondary track (the same hues in stronger steps, so the bar stands
 * off the track, and still lighter toward the middle), and `text` is the ink
 * for a value printed next to a band (always a text token). The empty `bar` is
 * a hollow ring, so "not graded yet" never passes for the pale middle step.
 */
const ORANGE = "var(--class-orange-accent)";
const BLUE = "var(--class-blue-accent)";

export const HEAT_TONE: Record<HeatBand, { cell: string; bar: string; text: string }> = {
  lowest: {
    cell: "bg-[color-mix(in_oklab,var(--class-orange-accent)_35%,var(--warning-soft))] text-foreground",
    bar: "bg-[var(--class-orange-accent)]",
    text: "text-foreground",
  },
  low: {
    cell: "bg-[color-mix(in_oklab,var(--class-orange-accent)_12%,color-mix(in_oklab,var(--warning-soft)_60%,var(--card)))] text-foreground",
    bar: "bg-[color-mix(in_oklab,var(--class-orange-accent)_80%,var(--card))]",
    text: "text-foreground",
  },
  mid: {
    cell: "bg-[color-mix(in_oklab,var(--foreground)_7%,var(--card))] text-foreground",
    bar: "bg-[color-mix(in_oklab,var(--foreground)_28%,var(--card))]",
    text: "text-foreground",
  },
  high: {
    cell: "bg-[color-mix(in_oklab,var(--class-blue-accent)_16%,var(--card))] text-foreground",
    bar: "bg-[color-mix(in_oklab,var(--class-blue-accent)_80%,var(--card))]",
    text: "text-foreground",
  },
  highest: {
    cell: "bg-[color-mix(in_oklab,var(--class-blue-accent)_36%,var(--card))] text-foreground",
    bar: "bg-[var(--class-blue-accent)]",
    text: "text-foreground",
  },
  empty: {
    cell: "bg-transparent text-muted-foreground outline-1 -outline-offset-1 outline-dashed outline-input/40",
    bar: "bg-transparent ring-1 ring-muted-foreground ring-inset",
    text: "text-muted-foreground",
  },
};

/** The two hues, for documentation and tests (the classes above spell them out for Tailwind). */
export const HEAT_HUES = { low: ORANGE, high: BLUE } as const;

/** Legend entries, low to high, with their swatch classes. */
export const HEAT_LEGEND = HEAT_BANDS.map((band) => ({ ...band, tone: HEAT_TONE[band.key] }));
