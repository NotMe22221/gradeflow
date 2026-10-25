import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Confidence } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STYLES: Record<Confidence, { variant: "success" | "warning" | "danger"; dot: string; label: string }> = {
  high: { variant: "success", dot: "bg-success", label: "High" },
  medium: { variant: "warning", dot: "bg-warning", label: "Medium" },
  low: { variant: "danger", dot: "bg-danger", label: "Low" },
};

export const CONFIDENCE_EXPLAINER =
  "The model's own, uncalibrated self-report. Use it to sort the queue, not as the probability that a grade is correct.";

/**
 * Color-coded AI confidence. Always framed as a self-report: the tooltip
 * makes clear it is a sorting signal, not a probability of correctness.
 */
export function ConfidenceBadge({
  confidence,
  className,
  showLabel = true,
}: {
  confidence: Confidence;
  className?: string;
  showLabel?: boolean;
}) {
  const style = STYLES[confidence];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={style.variant}
          className={cn("cursor-help", className)}
          aria-label={`${style.label} self-reported confidence. ${CONFIDENCE_EXPLAINER}`}
        >
          <span className={cn("size-1.5 rounded-full", style.dot)} aria-hidden />
          {showLabel ? `${style.label} confidence` : style.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{CONFIDENCE_EXPLAINER}</TooltipContent>
    </Tooltip>
  );
}
