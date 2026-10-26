"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { TZ_COOKIE, TZ_COOKIE_MAX_AGE } from "@/lib/classroom/timezone";

function readCookie(name: string): string | undefined {
  for (const part of document.cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/**
 * Tells the server the viewer's time zone, so server-rendered dates ("Due
 * tomorrow", Missing, Stream dates) use the viewer's calendar day. Writes the
 * browser's zone to the "tz" cookie when it differs, then refreshes once if
 * the page on screen was rendered in another zone. Nothing is kept in
 * localStorage. Renders nothing.
 */
export function TimeZoneCookie({ serverTimeZone }: { serverTimeZone: string }) {
  const router = useRouter();

  useEffect(() => {
    let zone: string | undefined;
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!zone) return;
    const current = readCookie(TZ_COOKIE);
    if (current === zone) return;

    document.cookie = `${TZ_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=${TZ_COOKIE_MAX_AGE}; samesite=lax`;
    // The page was rendered in the old cookie's zone, or in the server's zone
    // without one. Re-render once in the viewer's zone, and only if the cookie
    // stuck (with cookies blocked, a refresh would change nothing).
    const renderedIn = current ?? serverTimeZone;
    if (renderedIn !== zone && readCookie(TZ_COOKIE) === zone) router.refresh();
  }, [router, serverTimeZone]);

  return null;
}
