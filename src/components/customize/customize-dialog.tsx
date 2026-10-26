"use client";

import type { Preferences } from "@/lib/preferences/schema";

/**
 * The Customize dialog (appearance + layout settings). Placeholder with the
 * agreed props; the theme owner implements it.
 */
export function CustomizeDialog(_props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: Preferences;
  role: "TEACHER" | "STUDENT";
}) {
  return null;
}
