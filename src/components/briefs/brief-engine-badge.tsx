import { FlaskConical, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { BriefEngine } from "@/lib/briefs/types";
import { briefEngineLabel } from "@/lib/briefs/text";
import { cn } from "@/lib/utils";

const focusable = "cursor-help outline-none focus-visible:ring-[3px] focus-visible:ring-ring";

/**
 * Which engine drafted the brief, as a chip: tonal "AI draft" for the live
 * engine, dashed "Demo brief" for the local template. The demo template must
 * never pass for AI output.
 */
export function BriefEngineBadge({
  engine,
  model,
  className,
}: {
  engine: BriefEngine;
  model: string | null;
  className?: string;
}) {
  const label = briefEngineLabel(engine, model);
  const tooltip =
    engine === "demo"
      ? "No OPENAI_API_KEY is set, so a local template builds this brief from the same approved grades. It is not AI output."
      : `Drafted on the server by the OpenAI API${model ? ` (${model})` : ""} from teacher-approved grades only. Check every line before sharing it.`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={engine === "demo" ? "outline" : "default"}
          tabIndex={0}
          className={cn(
            "h-7 rounded-full px-3 text-[13px] [&>svg]:size-3.5",
            engine === "demo" && "border-dashed",
            focusable,
            className
          )}
        >
          {engine === "demo" ? <FlaskConical aria-hidden /> : <Sparkles aria-hidden />}
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
