// The viewer's time zone, carried from the browser to the server in a cookie
// so dates can be rendered on the server in the viewer's calendar day. Pure:
// safe for server and client components and unit tests. The server-only
// reader is viewer-time-zone.ts; the browser side is <TimeZoneCookie />.

/** Cookie holding the browser's IANA time zone, e.g. "America/Los_Angeles". */
export const TZ_COOKIE = "tz";

/** A year: the cookie is rewritten whenever the browser's zone changes. */
export const TZ_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Must start with a letter, which rules out offset zones like "+05:30" that
// Intl would otherwise accept.
const ZONE_PATTERN = /^[A-Za-z][A-Za-z0-9_+\-/]{0,63}$/;
const ETC_OFFSET = /^Etc\/GMT[+-]\d{1,2}$/;

let supported: Set<string> | undefined;

/** Canonical IANA zones, plus "UTC", which supportedValuesOf leaves out. */
function supportedZones(): Set<string> {
  return (supported ??= new Set([...Intl.supportedValuesOf("timeZone"), "UTC"]));
}

/**
 * The canonical name of a real IANA time zone, or undefined for anything
 * else. The cookie is client-controlled, so the value must resolve (through
 * Intl, which also maps aliases like Asia/Kolkata) to one of the few hundred
 * canonical zones; undefined means "use the server's zone". The fixed set
 * also bounds the per-zone formatter caches in format.ts and due.ts.
 */
export function safeTimeZone(value: string | null | undefined): string | undefined {
  if (!value || !ZONE_PATTERN.test(value)) return undefined;
  try {
    const zone = new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
    return supportedZones().has(zone) || ETC_OFFSET.test(zone) ? zone : undefined;
  } catch {
    return undefined;
  }
}

/** The server process's own zone (its TZ), the fallback when the viewer's is unknown. */
export function serverTimeZone(): string {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone;
}
