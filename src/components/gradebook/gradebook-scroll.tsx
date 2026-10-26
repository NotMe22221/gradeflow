"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons";

import { Button } from "@/components/ui/button";
import { scrollStateOf, UNMEASURED_SCROLL, type ScrollState } from "@/lib/insights/scroll";
import { scrollBehavior } from "@/lib/motion";
import { cn } from "@/lib/utils";

/*
 * Horizontal-scroll affordance for the Grades spreadsheet. The table stays a
 * server component; this wrapper measures whether it is wider than the card.
 * When it is, a hint bar says so (with previous / next buttons from sm up),
 * the sticky Students column casts a shadow over cells scrolled under it, and
 * the right edge fades while more columns are hidden there. Trackpads and
 * macOS hide the scrollbar, so these are the visible cues on a laptop.
 *
 * The scroller sets data-more-left / data-more-right for the table's sticky
 * cells (`group-data-[more-left=true]/grades:`).
 */
export function GradebookScroll({ label, children }: { label: string; children: ReactNode }) {
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
          : next
      );
    };
    measure();
    region.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    // The drawer opening or closing resizes the card without resizing the window.
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
      left: direction * Math.max(176, Math.round(region.clientWidth * 0.6)),
      behavior: scrollBehavior(),
    });
  }, []);

  const { overflowing, moreLeft, moreRight } = state;

  return (
    <>
      {/* Before the first measurement, only phones (where the grid nearly always overflows) show the hint, so nothing jumps on load. */}
      {overflowing === false ? null : (
        <div
          className={cn(
            "flex min-h-11 items-center justify-between gap-3 border-b border-border px-4 py-1.5 sm:pl-6",
            overflowing === null && "sm:hidden"
          )}
        >
          <p className="text-xs text-muted-foreground">
            <span className="sm:hidden">Newest first. Swipe sideways to see every assignment.</span>
            <span className="hidden sm:inline">Newest first. Scroll sideways to see every assignment.</span>
          </p>
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-controls={regionId}
              aria-label="Scroll the grades left"
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
              aria-label="Scroll the grades right"
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
          className="peer group/grades relative w-full overflow-x-auto outline-none"
        >
          {children}
        </div>
        {/* The scroller's focus ring, drawn above the opaque (and sticky z-10/z-20) cells that would cover an inset ring. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 hidden ring-[3px] ring-ring ring-inset peer-focus-visible:block"
        />
        {/* Right-edge fade while columns are hidden to the right. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-black/[0.08] to-transparent transition-opacity duration-200",
            moreRight ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
    </>
  );
}
