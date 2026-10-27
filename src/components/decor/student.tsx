// Decor compositions for the student side's color bands (the Home greeting and
// the goal planner); page titles use HeaderDecor from page-header.tsx, like the
// teacher's pages. Built from the primitives in decor.tsx, so every
// piece is aria-hidden, ignores the pointer, never prints, and disappears in
// the Calm look.
//
// Each band composition is placed inside a band that is a size container
// (`@container`), `relative isolate overflow-hidden`: sizes and offsets are in
// cqw, so the art scales with the band, and it switches layout on the band's
// own width, not the window's. The band's text keeps to the left of the art
// (see the max widths on the text in home-view.tsx and goal-planner.tsx);
// narrow bands keep a single blob in the top right corner, beside the title
// and above the first line under it (it ends 3-4rem below the band's top).

import { Blob, DotGrid, Squiggle, XGrid, type PopTone } from "@/components/decor/decor";

/** Wide-band pieces only show from this band width up (the text column then stops at 55%). */
const WIDE = "hidden @min-[34rem]:block";

/**
 * The student Home greeting (a yellow band): a coral blob bleeding off the top
 * right corner (the one that drifts), X marks on it, a mint blob rising from
 * the bottom edge and a pink squiggle between them and the text.
 */
export function GreetingDecor() {
  return (
    <>
      <Blob
        shape={2}
        tone="coral"
        float
        className="-top-16 -right-12 w-32 @min-[34rem]:-top-[12cqw] @min-[34rem]:-right-[5cqw] @min-[34rem]:w-[32cqw]"
      />
      <XGrid cols={5} rows={3} className={`${WIDE} top-[13cqw] right-[6cqw] w-[13cqw]`} />
      <Blob shape={5} tone="mint" className={`${WIDE} -bottom-[13cqw] right-[26cqw] w-[19cqw]`} />
      <Squiggle tone="pink" waves={2} className={`${WIDE} top-[6cqw] right-[33cqw] w-[8cqw] -rotate-6`} />
    </>
  );
}

/**
 * The goal planner (a lilac band): a yellow blob bleeding off the top right
 * corner with X marks on it, and a dot grid beside the heading. Only the heading strip
 * shows them: the planner's card covers the rest of the band.
 */
export function PlannerDecor() {
  return (
    <>
      <Blob
        shape={4}
        tone="yellow"
        className="-top-20 -right-12 w-32 @min-[34rem]:-top-[9cqw] @min-[34rem]:-right-[4cqw] @min-[34rem]:w-[22cqw]"
      />
      <XGrid cols={4} rows={2} className={`${WIDE} top-[3.5cqw] right-[5cqw] w-[10cqw]`} />
      <DotGrid cols={8} rows={3} className={`${WIDE} top-[4cqw] right-[25cqw] w-[11cqw]`} />
    </>
  );
}
