"use client";

import { useId } from "react";
import { FlaskConical, Sparkles } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EngineStatus } from "@/lib/ai/engines";
import { cn } from "@/lib/utils";

/**
 * Top-bar pill that always says which AI engines are live and which features
 * run on labelled demo engines. Icon-only on phones. Click or tap it for the
 * engine behind each feature (a popover, so it works on touch screens).
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
  // Radix renders the popover as role="dialog"; name it by its heading.
  const headingId = useId();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`AI engines: ${label}`}
          className={cn(
            "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2 text-xs font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring sm:px-2.5",
            liveCount === rows.length
              ? "border-transparent bg-primary-soft text-primary-soft-foreground"
              : "border-dashed border-border bg-card text-muted-foreground",
            className
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          <span className="hidden sm:inline" aria-hidden>
            {label}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" aria-labelledby={headingId} className="w-[min(22rem,calc(100vw-2rem))] text-sm">
        <p id={headingId} className="mb-2 font-medium text-foreground">
          AI engines
        </p>
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.feature} className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground">{row.feature}</span>
              <span className="flex items-center gap-1.5 text-right font-medium text-foreground">
                <span
                  className={cn("size-1.5 shrink-0 rounded-full", row.live ? "bg-success" : "bg-muted-foreground/50")}
                  aria-hidden
                />
                {row.engine}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-pretty text-muted-foreground">
          {allDemo
            ? "No API keys are set, so labelled local demo engines run. Their output is a placeholder, not real AI."
            : "Every AI result is a draft: nothing publishes until you approve it."}
        </p>
      </PopoverContent>
    </Popover>
  );
}
