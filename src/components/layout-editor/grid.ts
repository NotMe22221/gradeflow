/*
 * Class names for the arrangeable Home grid, shared by the live sections,
 * the edit mode and the loading skeletons so all three line up exactly.
 * Every breakpoint is a container query on the sections' own wrapper (the
 * width the page actually gets next to the drawer), never the viewport.
 */

/** The sections' wrapper: a size container. */
export const SECTIONS_CONTAINER = "@container/sections min-w-0";

/** One column on narrow pages; main + side from 52rem (a 20-22rem side column). */
export const SECTIONS_GRID = "grid grid-cols-1 gap-x-8 gap-y-10";
export const SECTIONS_SPLIT =
  "@min-[52rem]/sections:grid-cols-[minmax(0,1fr)_20rem] @min-[64rem]/sections:grid-cols-[minmax(0,1fr)_22rem]";

/** The main column: sections stacked. */
export const MAIN_STACK = "flex min-w-0 flex-col gap-10";

/**
 * The side column. Stacked under the main column on mid-size pages it lays
 * its sections out two across (one alone fills the row); beside the main
 * column it is a single stack.
 */
export const SIDE_STACK =
  "grid min-w-0 content-start gap-x-6 gap-y-10 @min-[40rem]/sections:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] @min-[52rem]/sections:grid-cols-1";

/** Class cards: as many 17rem+ columns as fit, one on a phone. */
export const CLASS_GRID = "grid grid-cols-[repeat(auto-fill,minmax(min(17rem,100%),1fr))] gap-6";
