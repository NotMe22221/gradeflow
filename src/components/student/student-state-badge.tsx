import { Badge } from "@/components/ui/badge";
import { studentStateDisplay, type StudentAssignmentState } from "@/components/student/student-status";
import { cn } from "@/lib/utils";

export function StudentStateBadge({
  state,
  paperTest = false,
  awaitingScan = false,
  className,
}: {
  state: StudentAssignmentState;
  /** A paper test: worded as "Paper test" / "Waiting for scan" / "Sent back" instead of submit states. */
  paperTest?: boolean;
  /** A paper test whose test day has passed without a scan. */
  awaitingScan?: boolean;
  className?: string;
}) {
  const display = studentStateDisplay(state, { paperTest, awaitingScan });
  return (
    <Badge variant={display.variant} className={className}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          display.variant === "success" && "bg-success",
          display.variant === "warning" && "bg-warning",
          display.variant === "secondary" && "bg-muted-foreground/60",
          display.variant === "outline" && "border border-muted-foreground/60"
        )}
        aria-hidden
      />
      {display.label}
    </Badge>
  );
}
