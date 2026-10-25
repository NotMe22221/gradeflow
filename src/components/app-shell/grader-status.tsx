import { FlaskConical, Sparkles } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { GraderInfo } from "@/lib/grading/config";
import { cn } from "@/lib/utils";

/** Top-bar pill that always says which grader is active. */
export function GraderStatus({ info, className }: { info: GraderInfo; className?: string }) {
  const demo = info.kind === "demo";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            "inline-flex h-7 cursor-help items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
            demo
              ? "border-dashed border-border bg-card text-muted-foreground"
              : "border-transparent bg-primary-soft text-primary-soft-foreground",
            className
          )}
        >
          {demo ? <FlaskConical className="size-3.5" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
          {demo ? info.label : `${info.label} grading`}
        </span>
      </TooltipTrigger>
      <TooltipContent align="end">
        {demo
          ? "No ANTHROPIC_API_KEY is set, so AI first passes use a local deterministic demo grader. Its output is a placeholder, not real AI."
          : `AI first passes use the Claude API (${info.model}). Suggestions only: every published grade needs your approval.`}
      </TooltipContent>
    </Tooltip>
  );
}
