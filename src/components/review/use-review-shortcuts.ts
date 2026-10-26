"use client";

import { useEffect, useEffectEvent } from "react";

import {
  isCharacterKey,
  isEditableTarget,
  ownsArrowKeys,
  shortcutForKey,
  type ReviewShortcutHandlers,
} from "@/lib/review/shortcuts";

/** Any modal, popover, menu, or open select currently in the document. */
function overlayIsOpen(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.querySelector(
      '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'
    ) !== null
  );
}

/**
 * Review queue keyboard shortcuts.
 *
 * "A" only ever opens the approval confirmation; publishing needs a click
 * (or Enter) on the dialog's confirm button. Shortcuts are ignored while the
 * teacher is typing, while any dialog or popover is open, with a modifier
 * key held, and on auto-repeat. With `singleKeys` off (the teacher's
 * setting), only the arrow keys work: letter shortcuts can clash with speech
 * input and some screen readers (WCAG 2.1.4).
 */
export function useReviewShortcuts(
  enabled: boolean,
  handlers: ReviewShortcutHandlers,
  { singleKeys = true }: { singleKeys?: boolean } = {}
) {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!enabled) return;
    if (event.defaultPrevented || event.repeat || event.isComposing) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (isEditableTarget(event.target) || isEditableTarget(document.activeElement)) return;
    if (overlayIsOpen()) return;

    const action = shortcutForKey(event.key);
    if (!action) return;
    if (!singleKeys && isCharacterKey(event.key)) return;
    if (event.key.startsWith("Arrow") && ownsArrowKeys(event.target)) return;
    event.preventDefault();
    handlers[action]();
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyDown(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}
