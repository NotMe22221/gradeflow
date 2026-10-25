import { Badge } from "@/components/ui/badge";
import { STUDENT_STATE_DISPLAY, type StudentAssignmentState } from "@/components/student/student-status";
import { cn } from "@/lib/utils";

export function StudentStateBadge({
  state,
  className,
}: {
  state: StudentAssignmentState;
  className?: string;
}) {
  const display = STUDENT_STATE_DISPLAY[state];
  return (
    <Badge variant={display.variant} className={className}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          state === "graded" && "bg-success",
          state === "returned" && "bg-warning",
          state === "submitted" && "bg-muted-foreground/60",
          state === "not_submitted" && "border border-muted-foreground/60"
        )}
        aria-hidden
      />
      {display.label}
    </Badge>
  );
}
