import "server-only";

import { cache } from "react";

import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  DEFAULT_PREFERENCES,
  mergePreferences,
  normalizePreferences,
  type Preferences,
  type PreferencesPatch,
} from "@/lib/preferences/schema";

/** A user's preferences (defaults when none are saved). Deduplicated per request. */
export const getPreferences = cache(async (userId: string): Promise<Preferences> => {
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

/** Merge a validated patch into the user's saved preferences and store them. */
export async function savePreferences(userId: string, patch: PreferencesPatch): Promise<Preferences> {
  const current = await getPreferences(userId);
  const next = mergePreferences(current, patch);
  const data = JSON.stringify(next);
  await db.userPreferences.upsert({
    where: { userId },
    create: { userId, data },
    update: { data },
  });
  return next;
}

/** Forget the user's saved preferences (back to defaults). */
export async function resetPreferences(userId: string): Promise<void> {
  await db.userPreferences.deleteMany({ where: { userId } });
}
