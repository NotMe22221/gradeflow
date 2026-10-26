"use client";

import { useSyncExternalStore } from "react";

/** Fired after the app changes the URL in a way the browser doesn't announce (pushState, replaceState). */
export const LOCATION_EVENT = "gs:locationchange";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  window.addEventListener(LOCATION_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(LOCATION_EVENT, onChange);
  };
}

/**
 * The URL's #hash, kept current. The App Router changes the URL with
 * history.pushState, which fires no event, so links that only change the
 * hash call notifyLocationChange() after navigating. Empty on the server.
 */
export function useLocationHash(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => ""
  );
}

/** Re-read the hash now (after the app itself changed the URL with replaceState or pushState). */
export function dispatchLocationChange() {
  window.dispatchEvent(new Event(LOCATION_EVENT));
}

/**
 * Re-read the hash once the router has updated the URL. The router commits
 * the new URL in a transition, a moment after the click, so check a few times.
 */
export function notifyLocationChange() {
  for (const delay of [0, 60, 250]) {
    window.setTimeout(dispatchLocationChange, delay);
  }
}
