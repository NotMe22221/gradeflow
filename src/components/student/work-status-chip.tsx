import {
  Check,
  CheckCheck,
  Circle,
  CircleAlert,
  Clock,
  CornerUpLeft,
  ScanLine,
  type IconComponent,
} from "@/components/icons";

import type { WorkStatus, WorkTone } from "@/components/student/todo-model";
import { cn } from "@/lib/utils";

/*
 * A student's status as an icon and a word, never color alone. Only what
 * needs the student (Missing, Sent back) or answers them (Returned) gets a
 * tinted container; everything else is quiet text, so a list never turns
 * into a wall of badges.
 */

const TONE: Record<WorkTone, { icon: IconComponent; className: string }> = {
  assigned: { icon: Circle, className: "text-muted-foreground" },
  missing: { icon: CircleAlert, className: "bg-danger-soft px-2 text-danger-soft-foreground" },
  done: { icon: Check, className: "text-muted-foreground" },
  returned: { icon: CheckCheck, className: "bg-success-soft px-2 text-success-soft-foreground" },
  attention: { icon: CornerUpLeft, className: "bg-warning-soft px-2 text-warning-soft-foreground" },
  neutral: { icon: Clock, className: "text-muted-foreground" },
};

/** Neutral statuses that read better with their own icon. */
const LABEL_ICON: Record<string, IconComponent> = {
  "Paper test": ScanLine,
  "Waiting for scan": Clock,
};

export function WorkStatusChip({
  status,
  className,
  srPrefix = false,
}: {
  status: WorkStatus;
  className?: string;
  /** Adds a visually hidden "Status: " before the word, for places where the word stands alone. */
  srPrefix?: boolean;
}) {
  const tone = TONE[status.tone];
  const Icon = LABEL_ICON[status.label] ?? tone.icon;
  return (
    <span
      data-tone={status.tone}
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-md text-[0.75rem] leading-none font-medium whitespace-nowrap",
        tone.className,
        className
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {srPrefix ? <span className="sr-only">Status: </span> : null}
      {status.label}
    </span>
  );
}
