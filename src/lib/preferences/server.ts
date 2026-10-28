import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { getCurrentUser, secureCookie } from "@/lib/auth/session";
import { demoLoginEnabled } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  decodePreferencesCookie,
  encodePreferencesCookie,
  PREFERENCES_COOKIE_MAX_AGE_SECONDS,
  preferencesCookieName,
} from "@/lib/preferences/cookie";
import {
  DEFAULT_PREFERENCES,
  mergePreferences,
  normalizePreferences,
  type Preferences,
  type PreferencesPatch,
} from "@/lib/preferences/schema";

/**
 * A user's preferences (defaults when none are saved). Deduplicated per request.
 * While demo sign-in is on, visitors share the demo accounts, so only this
 * browser's own copy (cookie.ts) counts, else the defaults. The shared row is
 * never read then: a row saved before settings moved into the browser would
 * otherwise reach every new visitor.
 */
export const getPreferences = cache(async (userId: string): Promise<Preferences> => {
  if (demoLoginEnabled()) {
    return decodePreferencesCookie((await cookies()).get(preferencesCookieName(userId))?.value) ?? DEFAULT_PREFERENCES;
  }
  const row = await db.userPreferences.findUnique({ where: { userId }, select: { data: true } });
  if (!row) return DEFAULT_PREFERENCES;
  try {
    return normalizePreferences(JSON.parse(row.data));
  } catch {
    return DEFAULT_PREFERENCES;
  }
});

/** The signed-in viewer's preferences, or defaults for signed-out pages. */
export async function getViewerPreferences(): Promise<Preferences> {
  const user = await getCurrentUser();
  return user ? getPreferences(user.id) : DEFAULT_PREFERENCES;
}

/** Keep preferences in this browser only (demo sign-in on). Server actions only. */
async function storeInBrowser(userId: string, prefs: Preferences): Promise<void> {
  (await cookies()).set(preferencesCookieName(userId), encodePreferencesCookie(prefs), {
    httpOnly: true,
    sameSite: "lax",
    secure: await secureCookie(),
    path: "/",
    maxAge: PREFERENCES_COOKIE_MAX_AGE_SECONDS,
  });
}

/**
 * Merge a validated patch into the user's saved preferences and store them:
 * in this browser while demo sign-in is on, so one visitor's changes never
 * reach another's, otherwise on the account.
 */
export async function savePreferences(userId: string, patch: PreferencesPatch): Promise<Preferences> {
  const current = await getPreferences(userId);
  const next = mergePreferences(current, patch);
  if (demoLoginEnabled()) {
    await storeInBrowser(userId, next);
    return next;
  }
  const data = JSON.stringify(next);
  await db.userPreferences.upsert({
    where: { userId },
    create: { userId, data },
    update: { data },
  });
  return next;
}

/**
 * Forget the user's saved preferences (back to defaults). While demo sign-in
 * is on, only this browser goes back to defaults: the shared row is left alone.
 */
export async function resetPreferences(userId: string): Promise<void> {
  if (demoLoginEnabled()) {
    await storeInBrowser(userId, DEFAULT_PREFERENCES);
    return;
  }
  await db.userPreferences.deleteMany({ where: { userId } });
}
