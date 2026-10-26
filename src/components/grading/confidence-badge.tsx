import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Confidence } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LEVELS: Record<Confidence, { label: string; bars: 1 | 2 | 3; fill: string }> = {
  high: { label: "High", bars: 3, fill: "bg-success" },
  medium: { label: "Medium", bars: 2, fill: "bg-warning" },
  low: { label: "Low", bars: 1, fill: "bg-danger" },
};

/** Bar heights in em, so the meter grows with the text size preference. */
const BAR_HEIGHTS = ["h-[0.4375em]", "h-[0.6875em]", "h-[0.9375em]"] as const;

const CONFIDENCE_EXPLAINER =
  "The model's own, uncalibrated self-report. Use it to sort the queue, not as the probability that a grade is correct.";

/** A three-step signal meter: how many bars are filled says the level, the word says it again. */
function Meter({ level }: { level: Confidence }) {
  const { bars, fill } = LEVELS[level];
  return (
    <span aria-hidden className="inline-flex h-[0.9375em] items-end gap-[0.125em]">
      {BAR_HEIGHTS.map((height, index) => (
        <span
          key={height}
          className={cn("w-[0.1875em] rounded-[1px]", height, index < bars ? fill : "bg-muted-foreground/30")}
        />
      ))}
    </span>
  );
}

/**
 * The AI's self-reported confidence, as a plain neutral label with a small
 * three-bar meter (the bar color is a second cue, never the only one). Always
 * framed as a self-report: the tooltip and the screen-reader text make clear
 * it is a sorting signal, not a probability of correctness.
 *
 * Pass `interactive={false}` when the badge sits inside another control
 * (e.g. a button), so it does not add a nested tab stop.
 */
export function ConfidenceBadge({
  confidence,
  className,
  showLabel = true,
  interactive = true,
}: {
  confidence: Confidence;
  className?: string;
  showLabel?: boolean;
  interactive?: boolean;
}) {
  const level = LEVELS[confidence];
  const badge = (
    <Badge
      variant="secondary"
      tabIndex={interactive ? 0 : undefined}
      data-confidence={confidence}
      className={cn(
        "gap-1.5",
        interactive && "cursor-help outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
        className
      )}
    >
      <Meter level={confidence} />
      {showLabel ? `${level.label} confidence` : level.label}
      <span className="sr-only">
        {showLabel ? ". " : " self-reported confidence. "}
        {CONFIDENCE_EXPLAINER}
      </span>
    </Badge>
  );
  if (!interactive) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent className="max-w-xs">{CONFIDENCE_EXPLAINER}</TooltipContent>
    </Tooltip>
  );
}
