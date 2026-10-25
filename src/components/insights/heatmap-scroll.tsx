"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { scrollStateOf, UNMEASURED_SCROLL, type ScrollState } from "@/lib/insights/scroll";
import { cn } from "@/lib/utils";

/*
 * Horizontal-scroll affordance for the class heatmap. The table stays a server
 * component: HeatmapScrollRegion wraps it and measures whether it overflows,
 * and HeatmapScrollHint (in the card header) shows "Scroll sideways" with
 * previous / next buttons only when it does. Trackpads and macOS hide the
 * scrollbar, so the buttons are the visible cue on a laptop.
 *
 * The region also sets data-more-left / data-more-right, so the sticky Student
 * and Average columns can cast a soft edge shadow over the cells scrolled
 * underneath them (`group-data-[more-right=true]/heatmap:`).
 */

type HeatmapScrollContextValue = {
  regionId: string;
  state: ScrollState;
  registerRegion: (element: HTMLDivElement | null) => void;
  scrollByPage: (direction: -1 | 1) => void;
};

const HeatmapScrollContext = createContext<HeatmapScrollContextValue | null>(null);

export function HeatmapScrollProvider({ children }: { children: ReactNode }) {
  const regionId = useId();
  const [region, setRegion] = useState<HTMLDivElement | null>(null);
  const [state, setState] = useState<ScrollState>(UNMEASURED_SCROLL);

  useEffect(() => {
    if (!region) return;
    const measure = () => {
      const next = scrollStateOf(region.scrollLeft, region.scrollWidth, region.clientWidth);
      setState((prev) =>
        prev.overflowing === next.overflowing && prev.moreLeft === next.moreLeft && prev.moreRight === next.moreRight
          ? prev
          : next
      );
    };
    measure();
    region.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(region);
    if (region.firstElementChild) observer?.observe(region.firstElementChild);
    return () => {
      region.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [region]);

  const scrollByPage = useCallback(
    (direction: -1 | 1) => {
      if (!region) return;
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      region.scrollBy({
        left: direction * Math.max(160, Math.round(region.clientWidth * 0.6)),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    },
    [region]
  );

  const value = useMemo(
    () => ({ regionId, state, registerRegion: setRegion, scrollByPage }),
    [regionId, state, scrollByPage]
  );

  return <HeatmapScrollContext.Provider value={value}>{children}</HeatmapScrollContext.Provider>;
}

/** The labelled, keyboard-focusable scroll container around the heatmap table. */
export function HeatmapScrollRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const context = useContext(HeatmapScrollContext);
  return (
    <div
      ref={context?.registerRegion}
      id={context?.regionId}
      role="region"
      aria-label={label}
      tabIndex={0}
      data-more-left={context?.state.moreLeft ? "true" : "false"}
      data-more-right={context?.state.moreRight ? "true" : "false"}
      // relative: the table's sr-only text is absolutely positioned. Without a
      // positioned ancestor inside the scroller it escapes the clip and widens
      // the whole page on a phone.
      className={cn(
        "group/heatmap relative overflow-x-auto outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * "Scroll sideways to see every column" with previous / next buttons, shown
 * only while the heatmap is wider than its card. Before the first measurement
 * it shows on phones only, where the table nearly always overflows, so the
 * header doesn't jump on load.
 */
export function HeatmapScrollHint({ className }: { className?: string }) {
  const context = useContext(HeatmapScrollContext);
  if (!context || context.state.overflowing === false) return null;
  const { overflowing, moreLeft, moreRight } = context.state;

  return (
    <div className={cn("flex shrink-0 items-center gap-3", overflowing === null && "sm:hidden", className)}>
      <p className="text-xs text-muted-foreground">
        <span className="sm:hidden">Swipe sideways to see every column.</span>
        <span className="hidden sm:inline">Scroll sideways to see every column</span>
      </p>
      <div className="hidden items-center gap-1 sm:flex">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-controls={context.regionId}
          aria-label="Scroll the heatmap left"
          disabled={!moreLeft}
          onClick={() => context.scrollByPage(-1)}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-controls={context.regionId}
          aria-label="Scroll the heatmap right"
          disabled={!moreRight}
          onClick={() => context.scrollByPage(1)}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}
