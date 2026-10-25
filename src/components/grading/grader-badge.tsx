import { FlaskConical, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GRADER_DESCRIPTIONS, GRADER_LABELS, type GraderKind } from "@/lib/constants";
import { cn } from "@/lib/utils";

const focusable = "cursor-help outline-none focus-visible:ring-[3px] focus-visible:ring-ring";

/**
 * Says which engine produced a suggestion. The demo grader is a local,
 * deterministic heuristic and must never be mistaken for real AI output.
 */
export function GraderBadge({
  grader,
  model,
  className,
}: {
  grader: GraderKind;
  model?: string | null;
  className?: string;
}) {
  if (grader === "demo") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" tabIndex={0} className={cn("border-dashed", focusable, className)}>
            <FlaskConical aria-hidden />
            {GRADER_LABELS.demo}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{GRADER_DESCRIPTIONS.demo(null)}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="default" tabIndex={0} className={cn(focusable, className)}>
          <Sparkles aria-hidden />
          {GRADER_LABELS[grader]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{GRADER_DESCRIPTIONS[grader](model ?? null)}</TooltipContent>
    </Tooltip>
  );
}
