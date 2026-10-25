import { FlaskConical, History, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { GoalEngine } from "@/lib/goals/types";
import { cn } from "@/lib/utils";

const focusable = "cursor-help outline-none focus-visible:ring-[3px] focus-visible:ring-ring";

const DEMO_TOOLTIP =
  "No OPENAI_API_KEY is set, so a local demo planner reads your goal with simple patterns and the study tip is a template. The scores are calculated the same way either way.";

const SAVED_TOOLTIP =
  "Your saved goal, re-planned against your latest teacher-approved grades. The study tip is a built-in template, not AI output.";

function openAiTooltip(model: string | null): string {
  return `OpenAI's ${model ?? "text model"} read your goal and wrote the study tip. It never does the math: every score is calculated by GradeSmart from your teacher-approved grades.`;
}

/**
 * Says which engine read the goal. The demo planner and a re-planned saved
 * goal must never be mistaken for AI output.
 */
export function GoalEngineBadge({
  engine,
  model,
  className,
}: {
  /** null: a saved goal re-planned on page load (no AI involved). */
  engine: GoalEngine | null;
  model: string | null;
  className?: string;
}) {
  if (engine === "openai") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="default" tabIndex={0} className={cn(focusable, className)}>
            <Sparkles aria-hidden />
            {model ?? "OpenAI"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{openAiTooltip(model)}</TooltipContent>
      </Tooltip>
    );
  }
  if (engine === "demo") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" tabIndex={0} className={cn("border-dashed", focusable, className)}>
            <FlaskConical aria-hidden />
            Demo planner
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{DEMO_TOOLTIP}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" tabIndex={0} className={cn(focusable, className)}>
          <History aria-hidden />
          Saved goal
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{SAVED_TOOLTIP}</TooltipContent>
    </Tooltip>
  );
}
