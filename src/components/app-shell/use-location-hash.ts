"use client";

import { useSyncExternalStore } from "react";

const EVENT = "gs:locationchange";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(EVENT, onChange);
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

/**
 * Re-read the hash once the router has updated the URL. The router commits
 * the new URL in a transition, a moment after the click, so check a few times.
 */
export function notifyLocationChange() {
  for (const delay of [0, 60, 250]) {
    window.setTimeout(() => window.dispatchEvent(new Event(EVENT)), delay);
  }
}
