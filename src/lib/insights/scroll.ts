// Scroll state of the heatmap's horizontal scroller. Pure: safe for client
// components and unit tests.

export type ScrollState = {
  /** null until measured in the browser. */
  overflowing: boolean | null;
  /** Columns are hidden to the left (the table has been scrolled). */
  moreLeft: boolean;
  /** Columns are hidden to the right. */
  moreRight: boolean;
};

export const UNMEASURED_SCROLL: ScrollState = { overflowing: null, moreLeft: false, moreRight: false };

/** The scroll state of a box from its measurements, with 1px of slack for sub-pixel widths. */
export function scrollStateOf(scrollLeft: number, scrollWidth: number, clientWidth: number): ScrollState {
  const max = scrollWidth - clientWidth;
  const overflowing = max > 1;
  return {
    overflowing,
    moreLeft: overflowing && scrollLeft > 1,
    moreRight: overflowing && scrollLeft < max - 1,
  };
}
