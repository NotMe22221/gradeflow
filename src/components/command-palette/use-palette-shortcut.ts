"use client";

import { useEffect, useEffectEvent } from "react";

import { OVERLAY_SELECTOR, paletteShortcut } from "@/lib/search/shortcut";

/**
 * Ctrl/Cmd+K opens search from anywhere in the app, except while typing in a
 * field or while another dialog, menu or listbox is open (see
 * paletteShortcut), and closes the open palette. No single-key shortcut
 * (WCAG 2.1.4).
 */
export function usePaletteShortcut(open: boolean, setOpen: (open: boolean) => void) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    // The open palette is itself a dialog; only other overlays count.
    const overlayOpen = Array.from(document.querySelectorAll(OVERLAY_SELECTOR)).some(
      (element) => !element.closest("[data-command-palette]")
    );
    const result = paletteShortcut(event, { paletteOpen: open, overlayOpen, activeElement: document.activeElement });
    if (!result) return;
    event.preventDefault();
    setOpen(result === "open");
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}
