import { Blob, DotGrid, Squiggle, XGrid } from "@/components/decor/decor";
import { TitlePeriod } from "@/components/page-header";
import { cn } from "@/lib/utils";

/**
 * Home's greeting, poster style: today's date and "Welcome back, Morgan." in
 * big display type on a yellow band, with paint blobs, X marks and a squiggle
 * at its right edge. The band is a size container, so the decor follows the
 * room the band gets (the drawer open or collapsed), not the window: from
 * 36rem the heading keeps to the left 60% and the decor to the rest; narrower,
 * the decor keeps to the top right corner (behind the Arrange button) and a
 * strip along the bottom that the band leaves free for it. In the Calm look
 * the band turns plain and the strip closes up.
 */
export function GreetingBand({
  date,
  name,
  action,
  className,
}: {
  /** "Tuesday, October 27" */
  date: string;
  name: string;
  /** Top right: the Arrange button. */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <GreetingBandFrame className={className}>
      <p className="col-start-1 row-start-1 text-[0.9375rem] leading-6 font-semibold">{date}</p>
      {action ? <div className="col-start-2 row-start-1 flex justify-end">{action}</div> : null}
      <h1 className={GREETING_HEADING}>
        Welcome back, {name}
        <TitlePeriod onBand />
      </h1>
    </GreetingBandFrame>
  );
}

/** The heading's size and room: full width on a narrow band, the left 60% (at most 34rem) from 36rem. */
export const GREETING_HEADING =
  "display-section col-span-2 row-start-2 @min-[36rem]/greet:col-span-1 @min-[36rem]/greet:max-w-[60%] @min-[56rem]/greet:max-w-[34rem]";

/**
 * The band itself with its decor, for the greeting and for Home's loading
 * skeleton (so the band doesn't jump or repaint when the page arrives).
 * Children go in a two-column grid: the date and an action on row 1, the
 * heading (GREETING_HEADING) on row 2.
 */
export function GreetingBandFrame({
  as: Tag = "header",
  className,
  children,
}: {
  /** "div" for the skeleton. */
  as?: "header" | "div";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={cn(
        "@container/greet relative isolate grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 overflow-hidden rounded-[2rem] bg-band-yellow px-5 pt-5 pb-24 text-band-foreground [--background:var(--band-yellow)] [--ring:var(--band-foreground)]",
        // The bottom strip is for phones' decor: gone once the band is 36rem wide (main 39rem less
        // the page padding; the band can't query its own width), and in Calm.
        "sm:px-8 sm:pt-8 @min-[39rem]:pb-10 lg:px-12 lg:pt-11",
        "[[data-look=calm]_&]:pb-5 sm:[[data-look=calm]_&]:pb-8 lg:[[data-look=calm]_&]:pb-11",
        className
      )}
    >
      {/* Top right, behind the Arrange button: the coral blob (the one that drifts), X marks beside it. */}
      <Blob
        shape={2}
        tone="coral"
        float
        className="-top-16 -right-12 w-36 @min-[36rem]/greet:-top-24 @min-[36rem]/greet:-right-16 @min-[36rem]/greet:w-72 @min-[56rem]/greet:-top-28 @min-[56rem]/greet:w-[22rem]"
      />
      <XGrid
        cols={5}
        rows={3}
        className="top-8 right-[42%] hidden w-28 @min-[48rem]/greet:block @min-[56rem]/greet:right-[24rem] @min-[56rem]/greet:w-32"
      />
      {/* Bottom edge: a mint blob rising from it, dots and a squiggle (phones: in the strip under the heading). */}
      <Blob
        shape={5}
        tone="mint"
        className="right-6 -bottom-16 w-36 @min-[36rem]/greet:right-[20%] @min-[36rem]/greet:-bottom-28 @min-[36rem]/greet:w-56"
      />
      <DotGrid
        cols={8}
        rows={3}
        className="bottom-6 left-5 w-28 @min-[36rem]/greet:top-auto @min-[36rem]/greet:right-8 @min-[36rem]/greet:bottom-6 @min-[36rem]/greet:left-auto @min-[36rem]/greet:w-36"
      />
      <Squiggle
        tone="pink"
        className="bottom-10 left-40 w-20 @min-[36rem]/greet:hidden @min-[48rem]/greet:top-auto @min-[48rem]/greet:right-[44%] @min-[48rem]/greet:bottom-8 @min-[48rem]/greet:left-auto @min-[48rem]/greet:block @min-[48rem]/greet:w-24"
      />

      {children}
    </Tag>
  );
}
