import { HeaderDecor, PageHeader } from "@/components/page-header";
import { ScanEngineBadge } from "@/components/scan/engine-badge";
import { GRADER_LABELS } from "@/lib/constants";
import type { ScanEngineInfo } from "@/lib/scan/types";

/** The Paper Scanner's title, one-line explainer, and engine badge. */
export function ScanPageHeader({ engine }: { engine: ScanEngineInfo }) {
  return (
    <PageHeader
      title="Paper Scanner"
      description={
        engine.kind !== "demo"
          ? `Photograph a handwritten test. ${GRADER_LABELS[engine.kind]} reads it and drafts scores against your answer key. Nothing publishes until you approve it.`
          : "Photograph a handwritten test. The demo scanner uses the sample photos' stored transcriptions, or answers you type, and drafts scores against your answer key. Nothing publishes until you approve it."
      }
      actions={<ScanEngineBadge engine={engine} />}
      decor={<HeaderDecor tones={["coral", "sky"]} />}
    />
  );
}
