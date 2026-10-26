import { scrollBehavior } from "@/lib/motion";

/*
 * Keeping the control a keyboard user is working with focused and in view
 * while the arrangement changes under it. Scrolling goes through
 * scrollIntoView, so it honours html scroll-padding (the app bar, the sticky
 * "Arranging" bar via --edit-bar-h, and the bottom bar) and reduced motion.
 */

/** How long a sortable item takes to settle after a drop (its 200ms transition, plus a frame). */
export const SETTLE_MS = 250;

/** CSS.escape where it exists (every browser); ids here are plain words anyway. */
export function cssEscape(value: string): string {
  return typeof window !== "undefined" && window.CSS?.escape ? window.CSS.escape(value) : value;
}

/** The control marked data-control="<control>" inside `root`. */
export function findControl(root: ParentNode | null | undefined, control: string): HTMLElement | null {
  return root?.querySelector<HTMLElement>(`[data-control="${cssEscape(control)}"]`) ?? null;
}

/**
 * Focus `element` (unless it already has focus) and bring it into view. A
 * button that was just pressed usually keeps focus while its section or card
 * moves, and focus() on an already focused element never scrolls, so the
 * scroll is always explicit.
 */
export function revealControl(element: HTMLElement): void {
  if (document.activeElement !== element) element.focus({ preventScroll: true });
  element.scrollIntoView({ block: "nearest", inline: "nearest", behavior: scrollBehavior() });
}

/** True when focus is on `element`, or nowhere (it fell to the body when its control was re-rendered). */
export function focusIsOnOrLost(element: Element): boolean {
  const focused = document.activeElement;
  return focused === element || focused === null || focused === document.body;
}
