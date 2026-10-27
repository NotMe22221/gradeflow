"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons";

import { Button } from "@/components/ui/button";
import { scrollStateOf, UNMEASURED_SCROLL, type ScrollState } from "@/lib/insights/scroll";
import { scrollBehavior } from "@/lib/motion";
import { cn } from "@/lib/utils";

/*
 * Horizontal-scroll affordance for the judges' comparison table, the same
 * pattern as the Grades spreadsheet: the table stays a server component, and
 * this wrapper measures whether it is wider than its card. When it is, a hint
 * bar says so (with previous / next buttons from sm up), the sticky first
 * column casts a shadow over cells scrolled under it
 * (`group-data-[more-left=true]/compare:`), and the right edge fades while
 * more products are hidden there. Trackpads and phones hide the scrollbar, so
 * these are the visible cues.
 *
 * Before the first measurement the hint shows below lg only: the compact
 * table fits from lg up at the default text size, so nothing jumps on load.
 */
export function ComparisonScroll({ label, children }: { label: string; children: ReactNode }) {
  const regionId = useId();
  const regionRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ScrollState>(UNMEASURED_SCROLL);

  useEffect(() => {
    const region = regionRef.current;
    if (!region) return;
    const measure = () => {
      const next = scrollStateOf(region.scrollLeft, region.scrollWidth, region.clientWidth);
      setState((prev) =>
        prev.overflowing === next.overflowing && prev.moreLeft === next.moreLeft && prev.moreRight === next.moreRight
          ? prev
          : next,
      );
    };
    measure();
    region.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    // Showing the notes widens the table without resizing the window.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(region);
    if (region.firstElementChild) observer?.observe(region.firstElementChild);
    return () => {
      region.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, []);

  const scrollByPage = useCallback((direction: -1 | 1) => {
    const region = regionRef.current;
    if (!region) return;
    region.scrollBy({
      left: direction * Math.max(160, Math.round(region.clientWidth * 0.6)),
      behavior: scrollBehavior(),
    });
  }, []);

  const { overflowing, moreLeft, moreRight } = state;

  return (
    <>
      {overflowing === false ? null : (
        <div
          className={cn(
            "flex min-h-11 items-center justify-between gap-3 border-b border-border px-4 py-1.5",
            overflowing === null && "lg:hidden",
          )}
        >
          <p className="text-[0.8125rem] text-muted-foreground">
            <span className="sm:hidden">Swipe sideways to see every product.</span>
            <span className="hidden sm:inline">Scroll sideways to see every product.</span>
          </p>
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-controls={regionId}
              aria-label="Scroll the comparison left"
              disabled={!moreLeft}
              onClick={() => scrollByPage(-1)}
            >
              <ChevronLeft aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-controls={regionId}
              aria-label="Scroll the comparison right"
              disabled={!moreRight}
              onClick={() => scrollByPage(1)}
            >
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </div>
      )}
      <div className="relative">
        <div
          ref={regionRef}
          id={regionId}
          role="region"
          aria-label={overflowing ? `${label}. Scrolls sideways.` : label}
          // Focusable only while it scrolls, so arrow keys can move it; otherwise it is not a tab stop.
          tabIndex={overflowing ? 0 : undefined}
          data-more-left={moreLeft ? "true" : "false"}
          data-more-right={moreRight ? "true" : "false"}
          className={cn(
            // relative: the caption is sr-only (absolutely positioned); without a positioned
            // ancestor inside the scroller it would escape the clip and widen the page on a phone.
            "peer group/compare relative w-full overflow-x-auto outline-none",
            // Right-edge fade while products are hidden there. A mask (only its alpha counts), so it
            // fades the same way over every surface in both themes.
            moreRight && "[mask-image:linear-gradient(to_left,transparent,var(--foreground)_2.5rem)]",
          )}
        >
          {children}
        </div>
        {/* The scroller's focus ring, drawn above the opaque sticky cells that would cover an inset ring. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 hidden ring-[3px] ring-ring ring-inset peer-focus-visible:block"
        />
      </div>
    </>
  );
}
