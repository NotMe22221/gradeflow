"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import {
  defaultSectionLayout,
  LAYOUT_SURFACES,
  preferencesPatchSchema,
  type LayoutSurface,
  type Preferences,
} from "@/lib/preferences/schema";
import { resetPreferences, savePreferences } from "@/lib/preferences/server";

export type PreferencesResult = { ok: true; preferences: Preferences } | { ok: false; error: string };

/**
 * Save part of the signed-in user's preferences (any role). Only the fields
 * in preferencesPatchSchema are accepted; layout ids are checked again when
 * read, so a stale or forged id can only ever be ignored.
 */
export async function updatePreferences(patch: unknown): Promise<PreferencesResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to save your settings." };
  const parsed = preferencesPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Those settings couldn't be saved." };
  const preferences = await savePreferences(user.id, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, preferences };
}

/** Put one surface's sections back to the default arrangement. */
export async function resetSectionLayout(surface: LayoutSurface): Promise<PreferencesResult> {
  if (!(LAYOUT_SURFACES as readonly string[]).includes(surface)) return { ok: false, error: "Unknown page." };
  return updatePreferences({ layout: { [surface]: defaultSectionLayout(surface) } });
}

/** Forget every saved preference for the signed-in user. */
export async function resetAllPreferences(): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await resetPreferences(user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}
