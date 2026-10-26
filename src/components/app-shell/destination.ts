"use client";

import { useEffect, type MouseEvent, type RefObject } from "react";

import { hashOf, hashTargetId, isInPageHref, isPlainClick } from "@/components/app-shell/nav-model";
import { revealRequests } from "@/components/app-shell/reveal-request";
import { dispatchLocationChange, LOCATION_EVENT, notifyLocationChange } from "@/components/app-shell/use-location-hash";
import { scrollBehavior } from "@/lib/motion";

/*
 * Destinations that live on a page (Goals is the goal planner on student
 * Home, /student#goal-planner) and destinations re-selected while open.
 *
 * - From another page: the link leaves a reveal request, and the section
 *   scrolls itself into view and takes focus once it has mounted (the router
 *   gave up on the hash while the loading skeleton was up).
 * - On the same page (Goals on Home, or Goals or Home re-selected): the
 *   click is handled here, because the router neither scrolls nor moves
 *   focus for a same-path link. The URL is replaced, not pushed, so the
 *   highlighted destination always matches what is on screen.
 * - Scrolling a section fully out of view drops its #hash, so the nav only
 *   marks Goals while the planner is actually on screen.
 */

/** Focus an element that isn't focusable by itself, for this once (like the skip link). */
function focusOnce(target: HTMLElement) {
  if (!target.hasAttribute("tabindex")) {
    target.tabIndex = -1;
    target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
  }
  target.focus({ preventScroll: true });
}

/** Move focus to <main> without scrolling (after a menu sheet closes on a navigation). */
export function focusMain() {
  const main = document.getElementById("main");
  if (main) focusOnce(main);
}

/**
 * Scroll a section into view (scroll-margin and the html scroll padding keep
 * it clear of the sticky bars) and start keyboard and screen reader focus
 * there: on the heading that names it, else the section itself.
 */
export function revealElement(element: HTMLElement, { focus = true }: { focus?: boolean } = {}) {
  element.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  if (!focus) return;
  const labelId = element.getAttribute("aria-labelledby")?.split(/\s+/)[0];
  const label = labelId ? document.getElementById(labelId) : null;
  focusOnce(label && element.contains(label) ? label : element);
}

/**
 * Go to `href` on the page that is open: replace the URL (so Back still
 * leaves the page), then reveal its #section, or scroll to the top for the
 * page itself. Returns whether focus moved.
 */
export function showInPage(href: string): boolean {
  // Staying here: a reveal asked of another page no longer applies.
  revealRequests.clear();
  const { pathname, search, hash } = window.location;
  // Next's App Router patches replaceState, so usePathname and its state follow.
  if (`${pathname}${search}${hash}` !== href) window.history.replaceState(null, "", href);
  const id = hashTargetId(hashOf(href));
  const target = id ? document.getElementById(id) : null;
  if (target) revealElement(target);
  else window.scrollTo({ top: 0, behavior: scrollBehavior() });
  dispatchLocationChange();
  return Boolean(target);
}

/** Before following a link to another page: remember the #section it should open on, if any. */
export function prepareNavigation(href: string) {
  revealRequests.request(hashTargetId(hashOf(href)));
}

/** Whether `href` stays on the open page (differs at most in its #hash). */
export function isInPage(href: string): boolean {
  return isInPageHref(href, window.location);
}

/**
 * onClick for main-navigation links (bottom bar, rail, drawer). Another page
 * is left to next/link; the open page (Home on Home, Goals on Home, or a
 * destination re-selected) is handled in place, M3 style.
 */
export function onNavLinkClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
  // A new tab or window is the browser's job.
  if (!isPlainClick(event)) return;
  if (isInPage(href)) {
    event.preventDefault();
    showInPage(href);
    return;
  }
  prepareNavigation(href);
  notifyLocationChange();
}

/** The document itself was loaded at this exact URL (typed, bookmarked or reloaded), not reached in the app. */
function loadedHere(): boolean {
  try {
    const entry = performance.getEntriesByType("navigation")[0];
    return entry ? entry.name === window.location.href : false;
  } catch {
    return false;
  }
}

/** Set once a section has revealed itself for the page load, so a remount never does it again. */
let loadRevealDone = false;

/**
 * For the section a #hash destination names (the goal planner). It reveals
 * itself (scroll and focus) when a navigation asked for it, or on a direct
 * load of its URL, but never just because it re-mounted (Home re-arranged,
 * a refresh). And when it is scrolled fully out of view, the URL drops the
 * #hash, so the nav marks the page (Home) again rather than this section.
 */
export function useDestinationTarget(id: string, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    let disposed = false;
    let waitingForLoad: (() => void) | null = null;
    const stopWaiting = () => {
      if (waitingForLoad) window.removeEventListener("load", waitingForLoad);
      waitingForLoad = null;
    };
    const check = (mounting: boolean) => {
      if (hashTargetId(window.location.hash) !== id) return;
      const onLoad = mounting && !loadRevealDone && loadedHere();
      if (!onLoad && !revealRequests.has(id)) return;
      const reveal = () => {
        if (disposed) return;
        window.cancelAnimationFrame(frame);
        // After this commit's layout (and the router's own scroll attempt).
        frame = window.requestAnimationFrame(() => {
          revealRequests.take(id);
          if (onLoad) loadRevealDone = true;
          if (element.isConnected) revealElement(element);
        });
      };
      stopWaiting();
      // On a direct load the browser finishes its own #fragment handling at the load event,
      // which clears focus: reveal after it, or the focus doesn't stick.
      if (onLoad && document.readyState !== "complete") {
        waitingForLoad = () => {
          waitingForLoad = null;
          window.setTimeout(reveal, 0);
        };
        window.addEventListener("load", waitingForLoad, { once: true });
      } else {
        reveal();
      }
    };
    check(true);
    // A request can land just before the URL catches up: look again when it does.
    const onLocation = () => check(false);
    window.addEventListener(LOCATION_EVENT, onLocation);
    window.addEventListener("hashchange", onLocation);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      stopWaiting();
      window.removeEventListener(LOCATION_EVENT, onLocation);
      window.removeEventListener("hashchange", onLocation);
    };
  }, [id, ref]);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver !== "function") return;
    let visible: boolean | null = null;
    let disposed = false;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (disposed || !entry) return;
      const was = visible;
      visible = entry.isIntersecting;
      // Only a move from on screen to off screen, with the URL still naming this section.
      if (was !== true || visible || !element.isConnected || hashTargetId(window.location.hash) !== id) return;
      const { pathname, search } = window.location;
      window.history.replaceState(null, "", `${pathname}${search}`);
      dispatchLocationChange();
    });
    observer.observe(element);
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [id, ref]);
}
