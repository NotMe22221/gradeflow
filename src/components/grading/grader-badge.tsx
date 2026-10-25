import { FlaskConical, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GRADER_LABELS, type GraderKind } from "@/lib/constants";
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
        <TooltipContent>
          Local, deterministic heuristic used when no ANTHROPIC_API_KEY is set. Its scores and
          quotes are placeholders for the demo, not real AI output.
        </TooltipContent>
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
      <TooltipContent>
        First pass by the Claude API{model ? ` (${model})` : ""}. A suggestion only: nothing
        publishes until you approve it.
      </TooltipContent>
    </Tooltip>
  );
}
