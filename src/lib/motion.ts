/*
 * Motion preferences for scripted scrolling. CSS animations are handled in
 * globals.css; scrollIntoView / scrollTo / scrollBy calls go through here so
 * every one of them honours prefers-reduced-motion the same way.
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** True when the viewer asked the OS to reduce motion. False on the server. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** "smooth" normally, "auto" (an instant jump) when reduced motion is on. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}
