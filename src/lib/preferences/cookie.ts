// Preferences kept in the browser while one-click demo sign-in is on. Every
// visitor who clicks "View the demo" signs in as the same user, so one saved
// row per user would hand one visitor's theme, text size and Home layout to
// the next. Instead each browser keeps its own copy in a cookie per user id
// (see server.ts). Pure, so tests/preferences.test.ts can check it.

import { normalizePreferences, type Preferences } from "@/lib/preferences/schema";

const COOKIE_PREFIX = "mw_prefs_";

/** Longest cookie value we write, URL-encoded: well under the 4 KB browsers keep per cookie. */
export const PREFERENCES_COOKIE_MAX_LENGTH = 3000;

export const PREFERENCES_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** One cookie per user id, so switching demo accounts in a browser keeps each one's settings. */
export function preferencesCookieName(userId: string): string {
  return COOKIE_PREFIX + userId.replace(/[^A-Za-z0-9_-]/g, "_");
}

/**
 * The cookie value for these preferences (JSON). Next URL-encodes it, so the
 * limit applies to the encoded length. Only the class order can grow long:
 * classes past the limit are dropped from it and show after the ordered ones.
 */
export function encodePreferencesCookie(prefs: Preferences): string {
  let classOrder = prefs.layout.classOrder;
  for (;;) {
    const value = JSON.stringify({ ...prefs, layout: { ...prefs.layout, classOrder } });
    if (encodeURIComponent(value).length <= PREFERENCES_COOKIE_MAX_LENGTH || classOrder.length === 0) return value;
    classOrder = classOrder.slice(0, -1);
  }
}

/**
 * Preferences from a cookie value, or null when there is none or it isn't a
 * JSON object. The browser can send anything, so it is always normalized.
 */
export function decodePreferencesCookie(value: string | undefined): Preferences | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return normalizePreferences(parsed);
  } catch {
    return null;
  }
}
