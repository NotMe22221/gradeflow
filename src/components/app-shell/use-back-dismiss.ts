"use client";

import { useEffect, useEffectEvent } from "react";

import { overlayHistory } from "@/components/app-shell/overlay-history";

/**
 * While `open`, the browser's (or Android's) Back closes this overlay instead
 * of navigating the page under it. `enabled` is read when the overlay opens:
 * the full-screen search only takes over Back on phones, where it looks like
 * a screen of its own.
 */
export function useBackDismiss(open: boolean, close: () => void, enabled: () => boolean = () => true) {
  const onBack = useEffectEvent(close);
  const isEnabled = useEffectEvent(enabled);
  useEffect(() => {
    if (!open || !isEnabled()) return;
    const id = overlayHistory.open(() => onBack());
    return () => overlayHistory.release(id);
  }, [open]);
}
