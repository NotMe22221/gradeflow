"use client";

// Client helpers for the appearance preferences (theme, accent, text size,
// density). The server renders them as data-* attributes on <html>, so pages
// are right on first paint; these helpers change them instantly in the
// browser and save them, and let client components follow the current theme.

import { useSyncExternalStore } from "react";
import { toast } from "sonner";

import { THEME_COLOR } from "@/components/customize/options";
import { createSaveTracker } from "@/components/customize/pending-saves";
import { updatePreferences } from "@/lib/preferences/actions";
import {
  ACCENTS,
  DEFAULT_PREFERENCES,
  DENSITIES,
  TEXT_SIZES,
  THEMES,
  type Preferences,
} from "@/lib/preferences/schema";

export type Appearance = Pick<Preferences, "theme" | "accent" | "textSize" | "density">;

const ATTRIBUTES = {
  theme: "data-theme",
  accent: "data-accent",
  textSize: "data-text-size",
  density: "data-density",
} as const satisfies Record<keyof Appearance, string>;

const DARK_QUERY = "(prefers-color-scheme: dark)";

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** The appearance the page is showing now (from the <html> attributes). */
export function readAppearance(): Appearance {
  if (typeof document === "undefined") return pickAppearance(DEFAULT_PREFERENCES);
  const root = document.documentElement;
  return {
    theme: pick(root.getAttribute(ATTRIBUTES.theme), THEMES, DEFAULT_PREFERENCES.theme),
    accent: pick(root.getAttribute(ATTRIBUTES.accent), ACCENTS, DEFAULT_PREFERENCES.accent),
    textSize: pick(root.getAttribute(ATTRIBUTES.textSize), TEXT_SIZES, DEFAULT_PREFERENCES.textSize),
    density: pick(root.getAttribute(ATTRIBUTES.density), DENSITIES, DEFAULT_PREFERENCES.density),
  };
}

export function pickAppearance(prefs: Appearance): Appearance {
  return { theme: prefs.theme, accent: prefs.accent, textSize: prefs.textSize, density: prefs.density };
}

/** "light" or "dark": what a "system" theme resolves to right now. */
export function resolveTheme(theme: Appearance["theme"]): "light" | "dark" {
  if (theme !== "system") return theme;
  return typeof window !== "undefined" && window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** Point the browser chrome (theme-color, color-scheme metas) at the new theme. */
function syncMetaTags(theme: Appearance["theme"]) {
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const media = meta.getAttribute("media") ?? "";
    const forDark = theme === "system" ? (media ? media.includes("dark") : resolveTheme("system") === "dark") : theme === "dark";
    meta.content = forDark ? THEME_COLOR.dark : THEME_COLOR.light;
  }
  const scheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (scheme) scheme.content = theme === "system" ? "light dark" : theme;
}

/**
 * Show an appearance change at once by setting the <html> attributes. Color
 * transitions are paused for a frame so the whole page swaps together.
 */
export function applyAppearance(patch: Partial<Appearance>) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const themeChanges = patch.theme !== undefined && patch.theme !== root.getAttribute(ATTRIBUTES.theme);
  if (themeChanges) root.setAttribute("data-theme-switching", "");
  for (const key of Object.keys(ATTRIBUTES) as (keyof Appearance)[]) {
    const value = patch[key];
    if (value !== undefined) root.setAttribute(ATTRIBUTES[key], value);
  }
  if (patch.theme !== undefined) syncMetaTags(patch.theme);
  if (themeChanges) {
    // Two frames: one to paint the new colors without transitions, one to restore them.
    requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute("data-theme-switching")));
  }
}

/**
 * Values the user picked whose save hasn't finished, and the last stored value
 * of each (see pending-saves.ts). Saves run one after another, and each one
 * re-renders the page from the server, so a quick second change could briefly
 * be undone by the first save's (older) render of <html>. While a value is
 * pending, this observer puts it straight back, before the browser paints.
 */
const saves = createSaveTracker<keyof Appearance>();
let guard: MutationObserver | null = null;

function guardPending() {
  if (guard || typeof MutationObserver === "undefined") return;
  const root = document.documentElement;
  guard = new MutationObserver(() => {
    for (const [key, { value }] of saves.pending) {
      if (root.getAttribute(ATTRIBUTES[key]) !== value) root.setAttribute(ATTRIBUTES[key], value);
    }
  });
  guard.observe(root, { attributes: true, attributeFilter: Object.values(ATTRIBUTES) });
}

/**
 * Apply an appearance change and save it to the signed-in user's
 * preferences. If saving fails, the last saved look comes back (unless a
 * newer change has been made since, which reports its own outcome) and a
 * toast says so. `persist: false` only applies it, for signed-out pages.
 * Resolves to whether it was saved.
 */
export async function saveAppearance(
  patch: Partial<Appearance>,
  { persist = true }: { persist?: boolean } = {}
): Promise<boolean> {
  const onScreen = readAppearance();
  applyAppearance(patch);
  if (!persist) return true;
  guardPending();
  const save = saves.begin(patch, onScreen);
  let result: Awaited<ReturnType<typeof updatePreferences>>;
  try {
    result = await updatePreferences(patch);
  } catch {
    result = { ok: false, error: "Your change couldn't be saved. Check your connection and try again." };
  }
  const revert = saves.finish(save, result.ok) as Partial<Appearance>;
  if (result.ok) return true;
  // Every setting in this save already has a newer change on its way: that one reports instead.
  if (Object.keys(revert).length === 0) return false;
  applyAppearance(revert);
  toast.error(result.error);
  return false;
}

// --- Following the current appearance from React ----------------------------------

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: Object.values(ATTRIBUTES) });
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    query.removeEventListener("change", onChange);
  };
}

function snapshotKey(): string {
  const appearance = readAppearance();
  return [appearance.theme, appearance.accent, appearance.textSize, appearance.density, resolveTheme(appearance.theme)].join("|");
}

const SERVER_KEY = [
  DEFAULT_PREFERENCES.theme,
  DEFAULT_PREFERENCES.accent,
  DEFAULT_PREFERENCES.textSize,
  DEFAULT_PREFERENCES.density,
  "light",
].join("|");

function useAppearanceKey(): string {
  return useSyncExternalStore(subscribe, snapshotKey, () => SERVER_KEY);
}

/**
 * The appearance on screen, kept current when it changes anywhere (the
 * Customize dialog, a quick toggle, the server re-rendering <html>, or the
 * OS switching between light and dark). `resolved` is "light" or "dark".
 */
export function useAppearance(): Appearance & { resolved: "light" | "dark" } {
  const [theme, accent, textSize, density, resolved] = useAppearanceKey().split("|");
  return {
    theme: theme as Appearance["theme"],
    accent: accent as Appearance["accent"],
    textSize: textSize as Appearance["textSize"],
    density: density as Appearance["density"],
    resolved: resolved as "light" | "dark",
  };
}

/** Just "light" or "dark", for libraries that take a theme (toasts, charts). */
export function useResolvedTheme(): "light" | "dark" {
  return useAppearance().resolved;
}
