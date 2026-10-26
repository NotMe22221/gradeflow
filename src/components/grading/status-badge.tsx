import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  CornerUpLeft,
  Loader2,
  PenLine,
  type IconComponent,
} from "@/components/icons";

import { Badge } from "@/components/ui/badge";
import type { SubmissionStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline" | "success" | "warning" | "danger";

/**
 * Where a paper is, in plain words. Every status pairs its color with an
 * icon and a word, so color is never the only signal. A draft is "Needs
 * review" with the edit-note icon: it is a suggestion waiting for the
 * teacher, never a grade.
 */
const STATUS: Record<SubmissionStatus, { label: string; variant: Variant; icon: IconComponent; spin?: boolean }> = {
  SUBMITTED: { label: "Ready for AI pass", variant: "secondary", icon: Clock },
  GRADING: { label: "Grading…", variant: "default", icon: Loader2, spin: true },
  GRADING_FAILED: { label: "AI pass failed", variant: "danger", icon: AlertCircle },
  NEEDS_REVIEW: { label: "Needs review", variant: "warning", icon: PenLine },
  APPROVED: { label: "Approved", variant: "success", icon: Check },
  RETURNED: { label: "Sent back", variant: "outline", icon: CornerUpLeft },
  PUBLISHED: { label: "Published", variant: "success", icon: CheckCheck },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const entry = STATUS[status as SubmissionStatus];
  if (!entry) return <Badge variant="outline" className={className}>{status}</Badge>;
  const Icon = entry.icon;
  return (
    <Badge variant={entry.variant} className={className}>
      <Icon className={cn(entry.spin && "animate-spin")} aria-hidden />
      {entry.label}
    </Badge>
  );
}
