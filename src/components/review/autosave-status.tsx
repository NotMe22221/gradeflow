"use client";

import { CircleAlert, Cloud, CloudAlert, CloudCheck, LoaderCircle } from "lucide-react";

import type { SaveState } from "@/components/review/use-review-drafts";
import { cn } from "@/lib/utils";

/** Live draft status for the current paper. */
export function AutosaveStatus({
  state,
  onRetry,
  className,
}: {
  state: SaveState;
  onRetry: () => void;
  className?: string;
}) {
  const base = "inline-flex min-w-0 items-center gap-1.5 text-xs";
  let content: React.ReactNode;

  switch (state.status) {
    case "pending":
    case "saving":
      content = (
        <span className={cn(base, "text-muted-foreground")}>
          <LoaderCircle className="size-3.5 shrink-0 animate-spin" aria-hidden />
          Saving…
        </span>
      );
      break;
    case "saved":
      content = (
        <span className={cn(base, "text-muted-foreground")}>
          <CloudCheck className="size-3.5 shrink-0 text-success" aria-hidden />
          Draft saved
        </span>
      );
      break;
    case "error":
      content = (
        <span className={cn(base, "text-danger-soft-foreground")} title={state.error}>
          <CloudAlert className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">Couldn&apos;t save draft</span>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded font-medium underline underline-offset-2 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            Retry
          </button>
        </span>
      );
      break;
    case "blocked":
      content = (
        <span className={cn(base, "text-warning-soft-foreground")}>
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">Fix the highlighted field to save</span>
        </span>
      );
      break;
    default:
      content = (
        <span className={cn(base, "text-muted-foreground")}>
          <Cloud className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">Edits save as a draft</span>
        </span>
      );
  }

  return (
    <div role="status" aria-live="polite" className={cn("min-w-0", className)}>
      {content}
    </div>
  );
}
