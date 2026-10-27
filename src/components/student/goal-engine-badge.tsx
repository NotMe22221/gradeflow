import { FlaskConical, History, Cloud } from "@/components/icons";

import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { GoalEngine } from "@/lib/goals/types";
import { cn } from "@/lib/utils";

const DEMO_EXPLANATION =
  "No AI API key is set, so a local demo planner reads your goal with simple patterns and the study tip is a template. The scores are calculated the same way either way.";

const SAVED_EXPLANATION =
  "Your saved goal, re-planned against your latest teacher-approved grades. The study tip is a built-in template, not AI output.";

function liveExplanation(engine: "openai" | "claude", model: string | null): string {
  const reader = engine === "claude" ? `Claude${model ? ` (${model})` : ""}` : `OpenAI's ${model ?? "text model"}`;
  return `${reader} read your goal and wrote the study tip. It never does the math: every score is calculated by Markwise from your teacher-approved grades.`;
}

/**
 * A badge that is a real button: tap, click, Enter or Space opens the
 * explanation in a popover (a tooltip never opens on a touch screen), and an
 * outside tap or Escape closes it.
 */
function ExplainedBadge({
  variant,
  label,
  explanation,
  className,
  children,
}: {
  variant: "default" | "secondary" | "outline";
  /** What the badge says, for the button's accessible name. */
  label: string;
  explanation: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          asChild
          variant={variant}
          className={cn(
            // The after: layer grows the tap target to about 30px without moving anything.
            "relative cursor-pointer outline-none after:absolute after:-inset-1 after:content-[''] hover:shadow-hover focus-visible:ring-[3px] focus-visible:ring-ring",
            className
          )}
        >
          <button type="button" aria-label={`${label}: what this means`}>
            {children}
          </button>
        </Badge>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        aria-label={label}
        className="w-[min(20rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed text-muted-foreground"
      >
        {explanation}
      </PopoverContent>
    </Popover>
  );
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
  if (engine === "openai" || engine === "claude") {
    // gpt-4o-mini is short enough to name; a Claude model id is not, so its chip says Claude.
    const label = engine === "claude" ? "Claude" : (model ?? "OpenAI");
    return (
      <ExplainedBadge variant="default" label={label} explanation={liveExplanation(engine, model)} className={className}>
        <Cloud aria-hidden />
        {label}
      </ExplainedBadge>
    );
  }
  if (engine === "demo") {
    return (
      <ExplainedBadge
        variant="outline"
        label="Demo planner"
        explanation={DEMO_EXPLANATION}
        className={cn("border-dashed", className)}
      >
        <FlaskConical aria-hidden />
        Demo planner
      </ExplainedBadge>
    );
  }
  return (
    <ExplainedBadge variant="secondary" label="Saved goal" explanation={SAVED_EXPLANATION} className={className}>
      <History aria-hidden />
      Saved goal
    </ExplainedBadge>
  );
}
