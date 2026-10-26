import { PageHeader } from "@/components/page-header";
import { ScanEngineBadge } from "@/components/scan/engine-badge";

/** The Paper Scanner's title, one-line explainer, and engine badge. */
export function ScanPageHeader({ visionEnabled }: { visionEnabled: boolean }) {
  return (
    <PageHeader
      title="Paper Scanner"
      description={
        visionEnabled
          ? "Photograph a handwritten test. GPT-4o reads it and drafts scores against your answer key. Nothing publishes until you approve it."
          : "Photograph a handwritten test. The demo scanner uses the sample photos' stored transcriptions, or answers you type, and drafts scores against your answer key. Nothing publishes until you approve it."
      }
      actions={<ScanEngineBadge visionEnabled={visionEnabled} />}
    />
  );
}
