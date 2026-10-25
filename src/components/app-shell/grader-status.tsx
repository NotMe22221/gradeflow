import { FlaskConical, Sparkles } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EngineStatus } from "@/lib/ai/engines";
import { cn } from "@/lib/utils";

/**
 * Top-bar pill that always says which AI engines are live and which features
 * run on labelled demo engines. Icon-only on phones; the tooltip lists each
 * feature.
 */
export function GraderStatus({ status, className }: { status: EngineStatus; className?: string }) {
  const rows = [
    {
      feature: "Essays",
      engine: status.essays.kind === "demo" ? "Demo grader" : `Claude${status.essays.model ? ` (${status.essays.model})` : ""}`,
      live: status.essays.kind !== "demo",
    },
    {
      feature: "Handwritten tests",
      engine: status.vision.live ? status.vision.model ?? "OpenAI" : "Demo scanner",
      live: status.vision.live,
    },
    {
      feature: "Briefs and goal planner",
      engine: status.text.live ? status.text.model ?? "OpenAI" : "Demo templates",
      live: status.text.live,
    },
  ];
  const liveCount = rows.filter((row) => row.live).length;
  const allDemo = liveCount === 0;
  const label = allDemo ? "Demo engines" : liveCount === rows.length ? "AI engines live" : "Partly demo";
  const Icon = liveCount === rows.length ? Sparkles : FlaskConical;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            "inline-flex h-7 cursor-help items-center gap-1.5 rounded-full border px-2 text-xs font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring sm:px-2.5",
            liveCount === rows.length
              ? "border-transparent bg-primary-soft text-primary-soft-foreground"
              : "border-dashed border-border bg-card text-muted-foreground",
            className
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          <span className="sr-only sm:not-sr-only">{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent align="end" className="max-w-sm">
        <p className="mb-1.5 font-medium">AI engines</p>
        <ul className="space-y-1">
          {rows.map((row) => (
            <li key={row.feature} className="flex justify-between gap-4">
              <span className="opacity-80">{row.feature}</span>
              <span className="font-medium">{row.engine}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 opacity-80">
          {allDemo
            ? "No API keys are set, so labelled local demo engines run. Their output is a placeholder, not real AI."
            : "Every AI result is a draft: nothing publishes until you approve it."}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
