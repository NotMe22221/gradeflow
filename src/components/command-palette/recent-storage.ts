"use client";

import { parseRecent } from "@/lib/search/rank";

// Recent search picks are a per-browser convenience (like a remembered tab),
// so they live in localStorage, keyed by user. They hold only result keys;
// the palette shows a recent key only if it is still in the viewer's
// freshly loaded index.

function storageKey(userId: string): string {
  return `gs-recent-search:${userId}`;
}

export function readRecent(userId: string): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? parseRecent(JSON.parse(raw)) : [];
  } catch {
    // Storage blocked (private mode) or junk: no recent items.
    return [];
  }
}

export function writeRecent(userId: string, keys: readonly string[]) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(keys));
  } catch {
    // Not remembered; that's fine.
  }
}
