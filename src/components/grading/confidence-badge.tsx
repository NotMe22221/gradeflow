import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Confidence } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STYLES: Record<Confidence, { variant: "success" | "warning" | "danger"; dot: string; label: string }> = {
  high: { variant: "success", dot: "bg-success", label: "High" },
  medium: { variant: "warning", dot: "bg-warning", label: "Medium" },
  low: { variant: "danger", dot: "bg-danger", label: "Low" },
};

const CONFIDENCE_EXPLAINER =
  "The model's own, uncalibrated self-report. Use it to sort the queue, not as the probability that a grade is correct.";

/**
 * Color-coded AI confidence. Always framed as a self-report: the tooltip and
 * the screen-reader text make clear it is a sorting signal, not a
 * probability of correctness.
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
  const style = STYLES[confidence];
  const badge = (
    <Badge
      variant={style.variant}
      tabIndex={interactive ? 0 : undefined}
      className={cn(
        interactive && "cursor-help outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.dot)} aria-hidden />
      {showLabel ? `${style.label} confidence` : style.label}
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
      <TooltipContent>{CONFIDENCE_EXPLAINER}</TooltipContent>
    </Tooltip>
  );
}
