import { FlaskConical, Cloud } from "@/components/icons";

import { EngineInfoBadge } from "@/components/grading/engine-info-badge";
import type { BriefEngine } from "@/lib/briefs/types";
import { briefEngineLabel } from "@/lib/briefs/text";
import { cn } from "@/lib/utils";

/**
 * Which engine drafted the brief, as a chip: tonal "AI draft" for the live
 * engine, dashed "Demo brief" for the local template. The demo template must
 * never pass for AI output. Click or tap the chip for what the engine does.
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
  const demo = engine === "demo";
  const explanation = demo
    ? "No OPENAI_API_KEY is set, so a local template builds this brief from the same approved grades. It is not AI output."
    : `Drafted on the server by the OpenAI API${model ? ` (${model})` : ""} from teacher-approved grades only. Check every line before sharing it.`;

  return (
    <EngineInfoBadge
      variant={demo ? "outline" : "default"}
      dashed={demo}
      icon={demo ? <FlaskConical aria-hidden /> : <Cloud aria-hidden />}
      label={briefEngineLabel(engine, model)}
      explanation={explanation}
      align="end"
      className={cn("h-7 rounded-full px-3 text-[0.8125rem] [&>svg]:size-3.5", className)}
    />
  );
}
