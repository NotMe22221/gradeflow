"use client";

import { useSyncExternalStore } from "react";

import { modifierLabel } from "@/lib/search/shortcut";

function platform(): string | undefined {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return nav.userAgentData?.platform || nav.platform;
}

function subscribe() {
  return () => {};
}

/** "⌘" on Apple devices, else "Ctrl", for shortcut hints. "Ctrl" on the server, then the real one. */
export function useModifierLabel(): "⌘" | "Ctrl" {
  return useSyncExternalStore(subscribe, () => modifierLabel(platform()), () => "Ctrl");
}
