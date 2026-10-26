import { FlaskConical, ScanEye } from "@/components/icons";

import { EngineInfoBadge } from "@/components/grading/engine-info-badge";

const VISION_EXPLANATION =
  "Photos are read on the server by OpenAI's GPT-4o vision model, which transcribes the handwriting and drafts a score per question. Nothing publishes until you approve it.";

const DEMO_EXPLANATION =
  "No OPENAI_API_KEY is set, so a local demo scanner runs instead. It can't read handwriting: it only recognizes the bundled sample photos, or uses a transcription you type. Its scores are keyword-match placeholders, not real AI output.";

/**
 * Which engine reads the photos. The demo scanner must never be mistaken for
 * GPT-4o. Click or tap the chip for what the engine does.
 */
export function ScanEngineBadge({ visionEnabled, className }: { visionEnabled: boolean; className?: string }) {
  return visionEnabled ? (
    <EngineInfoBadge
      variant="default"
      icon={<ScanEye aria-hidden />}
      label="GPT-4o vision"
      explanation={VISION_EXPLANATION}
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
      className={className}
    />
  );
}
