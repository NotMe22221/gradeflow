import { Badge } from "@/components/ui/badge";
import type { SubmissionStatus } from "@/lib/constants";

const STATUS: Record<
  SubmissionStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" | "danger" }
> = {
  SUBMITTED: { label: "Ready for AI pass", variant: "secondary" },
  GRADING: { label: "Grading…", variant: "default" },
  GRADING_FAILED: { label: "AI pass failed", variant: "danger" },
  NEEDS_REVIEW: { label: "Needs review", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  RETURNED: { label: "Sent back", variant: "outline" },
  PUBLISHED: { label: "Published", variant: "success" },
};

export function StatusBadge({ status }: { status: string }) {
  const entry = STATUS[status as SubmissionStatus] ?? { label: status, variant: "outline" as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}
