"use client";

import { useEffect, useRef } from "react";
import { Flag, ScanSearch } from "@/components/icons";

import { Avatar } from "@/components/ui/avatar";
import type { Confidence } from "@/lib/constants";
import { pluralize } from "@/lib/format";
import { hasFlags } from "@/lib/review/model";
import type { ReviewItem } from "@/lib/review/types";
import { cn } from "@/lib/utils";

const LEVELS: Record<Confidence, { bars: 1 | 2 | 3; label: string }> = {
  high: { bars: 3, label: "High" },
  medium: { bars: 2, label: "Medium" },
  low: { bars: 1, label: "Low" },
};

/** Bar heights in em, so the meter grows with the text size preference. */
const BAR_HEIGHTS = ["h-[0.375em]", "h-[0.5625em]", "h-[0.75em]"] as const;

/**
 * A small three-bar meter for the model's confidence: the number of filled
 * bars is the level, so it reads without color. It is the model's own,
 * uncalibrated self-report, and the label says so: a sorting signal, not a
 * probability that the grade is right.
 */
export function ConfidenceMeter({ confidence, className }: { confidence: Confidence; className?: string }) {
  const level = LEVELS[confidence];
  return (
    <span
      role="img"
      aria-label={`${level.label} self-reported confidence`}
      title={`${level.label} confidence (self-reported, uncalibrated)`}
      className={cn("inline-flex h-[0.75em] shrink-0 items-end gap-[0.125em] text-[0.875rem]", className)}
    >
      {BAR_HEIGHTS.map((height, index) => (
        <span
          key={height}
          className={cn("w-[0.1875em] rounded-[1px] bg-current", height, index >= level.bars && "opacity-25")}
        />
      ))}
    </span>
  );
}

/**
 * A quiet "worth rechecking" marker: a document-search icon and the number of
 * reasons, so it reads without color. The name says what it is (and how many
 * flags, when it stands in for the flag icon); the reasons themselves are in
 * the grade panel (lib/review/recheck.ts, stored data only).
 */
export function RecheckMarker({
  reasons,
  flags = 0,
  className,
}: {
  reasons: number;
  /** Validation flags on the draft, named too because the marker replaces the flag icon. */
  flags?: number;
  className?: string;
}) {
  const label = `Worth rechecking: ${pluralize(reasons, "reason")}${
    flags > 0 ? `, ${pluralize(flags, "flag")} to check` : ""
  }`;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn("tabular inline-flex items-center gap-0.5 text-[0.75rem] leading-none font-medium", className)}
    >
      <ScanSearch className="size-4" aria-hidden />
      <span aria-hidden>{reasons}</span>
    </span>
  );
}

/**
 * The grading list, as in Classroom's grading tool: one row per paper with
 * the student's avatar, name, assignment, the working draft grade, the
 * "worth rechecking" marker, and the confidence meter and flag icon. Used in
 * the wide-screen rail and in the student switcher's popover. Rows tighten
 * with the compact density.
 */
export function QueueList({
  items,
  labels,
  totals,
  currentId,
  onSelect,
  className,
}: {
  items: ReviewItem[];
  /** Short, distinguishable assignment labels by assignment id. */
  labels: Map<string, string>;
  /** The working draft grade per submission id, e.g. "18/25". */
  totals?: Map<string, string>;
  currentId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the selected row in view when J/K, the URL, or a handled paper moves
  // the selection. Only this list scrolls (never the page): the math uses the
  // row's offset inside the list, which is its offsetParent (`relative`).
  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!list || !row || list.clientHeight === 0) return;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = Math.max(0, top - 8);
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 8;
  }, [currentId, items]);

  return (
    // `relative` keeps the rows' screen-reader text inside this scroller.
    <ul ref={listRef} className={cn("relative flex flex-col gap-0.5", className)}>
      {items.map((item) => {
        const active = item.id === currentId;
        const flagged = hasFlags(item);
        const flagCount = item.ai?.flags.length ?? 0;
        const recheck = item.recheck?.worth ? item.recheck.reasons.length : 0;
        const total = totals?.get(item.id);
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active ? "true" : undefined}
              title={`${item.student.name} · ${item.assignment.title}`}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring compact:min-h-12 compact:py-1.5",
                active ? "bg-primary-soft text-primary-soft-foreground" : "hover:bg-foreground/[0.04]"
              )}
            >
              <Avatar
                name={item.student.name}
                className={cn("size-9 text-[0.8125rem]", active && "bg-card text-primary ring-0")}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-sm font-medium",
                    active ? "text-primary-soft-foreground" : "text-foreground"
                  )}
                >
                  {item.student.name}
                </span>
                {/* Screen readers get the full title; the label may be shortened. */}
                <span className="sr-only">, {item.assignment.title}</span>
                <span
                  aria-hidden
                  className={cn(
                    "line-clamp-2 text-xs break-words",
                    active ? "text-primary-soft-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {labels.get(item.assignment.id) ?? item.assignment.title}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1.5">
                {total ? (
                  <span className="tabular text-[0.8125rem] italic" title="Draft grade, not returned yet">
                    <span className="sr-only">, draft grade </span>
                    {total}
                  </span>
                ) : null}
                <span className="flex items-center gap-1.5">
                  {/* The marker stands in for the flag icon: most reasons are flags, and the rail is narrow. */}
                  {recheck > 0 ? (
                    <RecheckMarker
                      reasons={recheck}
                      flags={flagCount}
                      className={active ? "text-primary-soft-foreground" : "text-foreground"}
                    />
                  ) : flagged ? (
                    <Flag
                      role="img"
                      className={cn("size-4", active ? "text-primary-soft-foreground" : "text-warning-soft-foreground")}
                      aria-label={`${flagCount} flag${flagCount === 1 ? "" : "s"} to check`}
                    />
                  ) : null}
                  {item.ai ? (
                    <ConfidenceMeter
                      confidence={item.ai.confidence}
                      className={active ? "text-primary-soft-foreground" : "text-muted-foreground"}
                    />
                  ) : null}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
