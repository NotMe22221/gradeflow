import { FlaskConical, ScanEye } from "@/components/icons";

import { EngineInfoBadge } from "@/components/grading/engine-info-badge";
import type { ScanEngineInfo } from "@/lib/scan/types";
import { cn } from "@/lib/utils";

const VISION_EXPLANATION: Record<Exclude<ScanEngineInfo["kind"], "demo">, (model: string | null) => string> = {
  openai: () =>
    "Photos are read on the server by OpenAI's GPT-4o vision model, which transcribes the handwriting and drafts a score per question. Nothing publishes until you approve it.",
  claude: (model) =>
    `Photos are read on the server by Claude${model ? ` (${model})` : ""}, which transcribes the handwriting and drafts a score per question. Nothing publishes until you approve it.`,
};

const VISION_LABEL: Record<Exclude<ScanEngineInfo["kind"], "demo">, string> = {
  openai: "GPT-4o vision",
  claude: "Claude vision",
};

const DEMO_EXPLANATION =
  "No AI API key is set, so a local demo scanner runs instead. It can't read handwriting: it only recognizes the bundled sample photos, or uses a transcription you type. Its scores are keyword-match placeholders, not real AI output.";

/**
 * Which engine reads the photos. The demo scanner must never be mistaken for
 * AI. Click or tap the chip for what the engine does.
 */
export function ScanEngineBadge({ engine, className }: { engine: ScanEngineInfo; className?: string }) {
  return engine.kind !== "demo" ? (
    <EngineInfoBadge
      variant="default"
      icon={<ScanEye aria-hidden />}
      label={VISION_LABEL[engine.kind]}
      explanation={VISION_EXPLANATION[engine.kind](engine.model)}
      align="end"
      className={className}
    />
  ) : (
    <EngineInfoBadge
      variant="outline"
      dashed
      icon={<FlaskConical aria-hidden />}
      label="Demo scanner"
      explanation={DEMO_EXPLANATION}
      align="end"
      className={cn(
        // An outline chip is see-through, and in the page header it sits on the decor's paint.
        "bg-card",
        className
      )}
    />
  );
}
