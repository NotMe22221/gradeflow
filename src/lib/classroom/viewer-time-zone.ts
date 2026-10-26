import "server-only";

import { cookies } from "next/headers";

import { safeTimeZone, TZ_COOKIE } from "@/lib/classroom/timezone";

/**
 * The signed-in viewer's time zone from the "tz" cookie (set by
 * <TimeZoneCookie /> in the root layout), validated with Intl. Undefined when
 * the cookie is missing or invalid: date helpers then use the server's zone.
 * "Today", relative due labels, Missing, and Stream dates all use this zone;
 * due dates themselves are calendar days and never shift with it.
 */
export async function viewerTimeZone(): Promise<string | undefined> {
  const store = await cookies();
  return safeTimeZone(store.get(TZ_COOKIE)?.value);
}
