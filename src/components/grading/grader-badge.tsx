import { FlaskConical, Sparkles } from "lucide-react";

import { EngineInfoBadge } from "@/components/grading/engine-info-badge";
import { GRADER_DESCRIPTIONS, GRADER_LABELS, type GraderKind } from "@/lib/constants";

/**
 * Says which engine produced a suggestion. The demo grader is a local,
 * deterministic heuristic and must never be mistaken for real AI output.
 * Click or tap the chip for what the engine does.
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
      <EngineInfoBadge
        variant="outline"
        dashed
        icon={<FlaskConical aria-hidden />}
        label={GRADER_LABELS.demo}
        explanation={GRADER_DESCRIPTIONS.demo(null)}
        className={className}
      />
    );
  }
  return (
    <EngineInfoBadge
      variant="default"
      icon={<Sparkles aria-hidden />}
      label={GRADER_LABELS[grader]}
      explanation={GRADER_DESCRIPTIONS[grader](model ?? null)}
      className={className}
    />
  );
}
