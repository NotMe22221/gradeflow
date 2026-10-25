"use client";

import { Flag } from "lucide-react";

import { ConfidenceBadge } from "@/components/grading/confidence-badge";
import { hasFlags } from "@/components/review/review-model";
import type { ReviewItem } from "@/components/review/types";
import { cn } from "@/lib/utils";

/** Compact list of queued papers, used in the 2xl rail and the jump popover. */
export function QueueList({
  items,
  currentId,
  onSelect,
  className,
}: {
  items: ReviewItem[];
  currentId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col gap-0.5", className)}>
      {items.map((item, index) => {
        const active = item.id === currentId;
        const flagged = hasFlags(item);
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                active ? "bg-accent ring-1 ring-border" : "hover:bg-accent/70"
              )}
            >
              <span
                className={cn(
                  "tabular w-4 shrink-0 text-right text-xs",
                  active ? "font-semibold text-primary" : "text-muted-foreground"
                )}
                aria-hidden
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-sm",
                    active ? "font-semibold text-foreground" : "font-medium text-foreground/90"
                  )}
                >
                  {item.student.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.assignment.title}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {flagged ? (
                  <Flag
                    role="img"
                    className="size-3.5 text-warning"
                    aria-label={`${item.ai?.flags.length ?? 0} flag${item.ai?.flags.length === 1 ? "" : "s"} to check`}
                  />
                ) : null}
                {item.ai ? <ConfidenceBadge confidence={item.ai.confidence} showLabel={false} /> : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
