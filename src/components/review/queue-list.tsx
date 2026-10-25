"use client";

import { Flag } from "lucide-react";

import { ConfidenceBadge } from "@/components/grading/confidence-badge";
import { hasFlags } from "@/lib/review/model";
import type { ReviewItem } from "@/lib/review/types";
import { cn } from "@/lib/utils";

/** Compact list of queued papers, used in the 2xl rail and the jump popover. */
export function QueueList({
  items,
  labels,
  currentId,
  onSelect,
  className,
}: {
  items: ReviewItem[];
  /** Short, distinguishable assignment labels by assignment id. */
  labels: Map<string, string>;
  currentId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    // `relative` keeps the rows' screen-reader text inside this scroller.
    <ul className={cn("relative flex flex-col gap-0.5", className)}>
      {items.map((item, index) => {
        const active = item.id === currentId;
        const flagged = hasFlags(item);
        const flagCount = item.ai?.flags.length ?? 0;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active ? "true" : undefined}
              title={`${item.student.name} · ${item.assignment.title}`}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                active ? "bg-accent ring-1 ring-border" : "hover:bg-accent/70"
              )}
            >
              <span
                className={cn(
                  "tabular w-4 shrink-0 self-start pt-px text-right text-xs",
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
                {/* Screen readers get the full title; the label may be shortened. */}
                <span className="sr-only">, {item.assignment.title}</span>
                <span aria-hidden className="line-clamp-2 text-xs break-words text-muted-foreground">
                  {labels.get(item.assignment.id) ?? item.assignment.title}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {flagged ? (
                  <Flag
                    role="img"
                    className="size-3.5 text-warning"
                    aria-label={`${flagCount} flag${flagCount === 1 ? "" : "s"} to check`}
                  />
                ) : null}
                {item.ai ? <ConfidenceBadge confidence={item.ai.confidence} showLabel={false} interactive={false} /> : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
