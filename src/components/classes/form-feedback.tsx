import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/** Inline message under a single field. Renders nothing without a message. */
export function FieldError({ id, message, className }: { id: string; message?: string; className?: string }) {
  if (!message) return null;
  return (
    <p id={id} className={cn("text-[13px] leading-snug text-destructive", className)}>
      {message}
    </p>
  );
}

/** Form-level error, announced to screen readers. */
export function FormAlert({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger-soft-foreground",
        className
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
