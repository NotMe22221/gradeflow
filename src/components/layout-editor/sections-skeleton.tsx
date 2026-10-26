import { Skeleton } from "@/components/ui/skeleton";
import type { SectionLayout } from "@/lib/preferences/schema";
import { cn } from "@/lib/utils";

import { MAIN_STACK, SECTIONS_CONTAINER, SECTIONS_GRID, SECTIONS_SPLIT, SIDE_STACK } from "./grid";
import { keepInMain, visibleIn } from "./model";

export type SectionSkeletonSpec = {
  node: React.ReactNode;
  /** The section draws its own heading inside its card (no title row above it). */
  ownHeading?: boolean;
  /** Has a "View all"-style link beside the title. */
  action?: boolean;
  mainOnly?: boolean;
};

/**
 * Loading state in the shape of the person's saved arrangement (same
 * columns, same order, hidden sections left out), so the page doesn't jump
 * when it arrives.
 */
export function SectionsSkeleton({
  layout,
  sections,
  className,
}: {
  layout: SectionLayout;
  sections: Record<string, SectionSkeletonSpec>;
  className?: string;
}) {
  const available = new Set(Object.keys(sections));
  const mainOnly = new Set(Object.keys(sections).filter((id) => sections[id]?.mainOnly));
  const placed = keepInMain(layout, mainOnly);
  let main = visibleIn(placed, "main", available);
  let side = visibleIn(placed, "side", available);
  if (main.length === 0) [main, side] = [side, []];

  const render = (id: string) => {
    const spec = sections[id] as SectionSkeletonSpec;
    return (
      <div key={id} className="min-w-0">
        {spec.ownHeading ? null : (
          <div className="mb-3 flex min-h-10 items-center justify-between gap-4">
            <Skeleton className="h-5 w-36" />
            {spec.action ? <Skeleton className="h-4 w-16" /> : null}
          </div>
        )}
        <div className="@container min-w-0">{spec.node}</div>
      </div>
    );
  };

  return (
    <div className={cn(SECTIONS_CONTAINER, className)} aria-hidden>
      <div className={cn(SECTIONS_GRID, side.length > 0 && SECTIONS_SPLIT)}>
        <div className={MAIN_STACK}>{main.map(render)}</div>
        {side.length > 0 ? <div className={SIDE_STACK}>{side.map(render)}</div> : null}
      </div>
    </div>
  );
}
