import { FlaskConical, ScanEye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const focusable = "cursor-help outline-none focus-visible:ring-[3px] focus-visible:ring-ring";

const VISION_TOOLTIP =
  "Photos are read on the server by OpenAI's GPT-4o vision model, which transcribes the handwriting and drafts a score per question. Nothing publishes until you approve it.";

const DEMO_TOOLTIP =
  "No OPENAI_API_KEY is set, so a local demo scanner runs instead. It can't read handwriting: it only recognizes the bundled sample photos, or uses a transcription you type. Its scores are keyword-match placeholders, not real AI output.";

/** Which engine reads the photos. The demo scanner must never be mistaken for GPT-4o. */
export function ScanEngineBadge({ visionEnabled, className }: { visionEnabled: boolean; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {visionEnabled ? (
          <Badge variant="default" tabIndex={0} className={cn(focusable, className)}>
            <ScanEye aria-hidden />
            GPT-4o vision
          </Badge>
        ) : (
          <Badge variant="outline" tabIndex={0} className={cn("border-dashed", focusable, className)}>
            <FlaskConical aria-hidden />
            Demo scanner
          </Badge>
        )}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{visionEnabled ? VISION_TOOLTIP : DEMO_TOOLTIP}</TooltipContent>
    </Tooltip>
  );
}
