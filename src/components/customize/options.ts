// Appearance choices with their user-facing names. Pure (no React, no DOM):
// shared by the Customize dialog, the theme quick toggle, menus or a command
// palette, and tests/theme.test.ts.

import type { Accent, Density, Look, PaperSide, TextSize, Theme } from "@/lib/preferences/schema";

export const THEME_OPTIONS: readonly { value: Theme; label: string; description: string }[] = [
  { value: "system", label: "System", description: "Matches your device" },
  { value: "light", label: "Light", description: "Always light, whatever your device uses." },
  { value: "dark", label: "Dark", description: "Always dark, whatever your device uses." },
];

export const ACCENT_OPTIONS: readonly { value: Accent; label: string }[] = [
  { value: "blue", label: "Blue" },
  { value: "teal", label: "Teal" },
  { value: "green", label: "Green" },
  { value: "orange", label: "Orange" },
  { value: "pink", label: "Pink" },
  { value: "slate", label: "Slate" },
];

/** `scale` is the root font size the option sets (see globals.css). */
export const TEXT_SIZE_OPTIONS: readonly { value: TextSize; label: string; scale: number }[] = [
  { value: "small", label: "Small", scale: 0.875 },
  { value: "default", label: "Default", scale: 1 },
  { value: "large", label: "Large", scale: 1.125 },
  { value: "larger", label: "Larger", scale: 1.25 },
];

export const DENSITY_OPTIONS: readonly { value: Density; label: string; description: string }[] = [
  { value: "comfortable", label: "Comfortable", description: "More space between rows" },
  { value: "compact", label: "Compact", description: "More rows on screen" },
];

export const LOOK_OPTIONS: readonly { value: Look; label: string; description: string }[] = [
  { value: "bold", label: "Bold", description: "Bright shapes, patterns and color bands" },
  { value: "calm", label: "Calm", description: "The same colors on plain backgrounds" },
];

export const PAPER_SIDE_OPTIONS: readonly { value: PaperSide; label: string }[] = [
  { value: "left", label: "Paper on the left" },
  { value: "right", label: "Paper on the right" },
];

/**
 * The browser's theme-color (mobile address bar, PWA title bar): the app
 * bar's surface, --card in globals.css (a test keeps them equal).
 */
export const THEME_COLOR = { light: "#ffffff", dark: "#1d1a21" } as const;

/** System -> Light -> Dark -> System, for a one-button theme toggle. */
export function nextTheme(theme: Theme): Theme {
  return theme === "system" ? "light" : theme === "light" ? "dark" : "system";
}

export function themeLabel(theme: Theme): string {
  return THEME_OPTIONS.find((option) => option.value === theme)?.label ?? "System";
}
