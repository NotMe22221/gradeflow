// The viewer's time zone, carried from the browser to the server in a cookie
// so dates can be rendered on the server in the viewer's calendar day. Pure:
// safe for server and client components and unit tests. The server-only
// reader is viewer-time-zone.ts; the browser side is <TimeZoneCookie />.

/** Cookie holding the browser's IANA time zone, e.g. "America/Los_Angeles". */
export const TZ_COOKIE = "tz";

/** A year: the cookie is rewritten whenever the browser's zone changes. */
export const TZ_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const ZONE_PATTERN = /^[A-Za-z0-9_+\-/]{1,64}$/;

/**
 * The canonical name of a valid IANA time zone, or undefined for anything
 * else. The cookie is client-controlled, so every value is checked with Intl
 * before it is used; undefined means "use the server's zone".
 */
export function safeTimeZone(value: string | null | undefined): string | undefined {
  if (!value || !ZONE_PATTERN.test(value)) return undefined;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/** The server process's own zone (its TZ), the fallback when the viewer's is unknown. */
export function serverTimeZone(): string {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone;
}
