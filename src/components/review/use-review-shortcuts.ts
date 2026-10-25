"use client";

import { useEffect, useEffectEvent } from "react";

/** Minimal element shape, so the guard is testable without a DOM. */
type ElementLike = {
  tagName?: unknown;
  isContentEditable?: unknown;
  getAttribute?: (name: string) => string | null;
  closest?: (selector: string) => unknown;
};

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);
// Roles that take typed characters. A Radix Select trigger is a button with
// role="combobox" that reacts to letter keys (typeahead).
const EDITABLE_ROLES = new Set(["textbox", "searchbox", "combobox", "spinbutton"]);
const CONTENT_EDITABLE =
  '[contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]';
const DIALOG = '[role="dialog"], [role="alertdialog"]';

/**
 * True when a key press on `target` belongs to the element, not to the
 * review shortcuts: text fields, selects, contenteditable regions, anything
 * with a text-entry role, and buttons inside dialogs (so Enter or a letter on
 * a focused dialog button never doubles as a shortcut).
 */
export function isEditableTarget(target: unknown): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as ElementLike;
  const tag = typeof el.tagName === "string" ? el.tagName.toUpperCase() : "";
  if (EDITABLE_TAGS.has(tag)) return true;
  if (el.isContentEditable === true) return true;

  const role = typeof el.getAttribute === "function" ? el.getAttribute("role") : null;
  if (role && EDITABLE_ROLES.has(role)) return true;

  if (typeof el.closest === "function") {
    if (el.closest(CONTENT_EDITABLE)) return true;
    if (tag === "BUTTON" && el.closest(DIALOG)) return true;
  }
  return false;
}

/** Widgets that use the arrow keys themselves (tabs, radio groups, sliders). */
function ownsArrowKeys(target: unknown): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as ElementLike;
  if (typeof el.closest !== "function") return false;
  return Boolean(el.closest('[role="tablist"], [role="radiogroup"], [role="slider"], [role="toolbar"]'));
}

/** Any modal, popover, menu, or open select currently in the document. */
function overlayIsOpen(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.querySelector(
      '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'
    ) !== null
  );
}

export type ReviewShortcutHandlers = {
  onNext: () => void;
  onPrevious: () => void;
  onApprove: () => void;
  onSendBack: () => void;
  onHelp: () => void;
};

export type ShortcutAction = keyof ReviewShortcutHandlers;

/** Map a key to a review action. Pure, for the hook and for tests. */
export function shortcutForKey(key: string): ShortcutAction | null {
  switch (key) {
    case "ArrowRight":
    case "j":
    case "J":
      return "onNext";
    case "ArrowLeft":
    case "k":
    case "K":
      return "onPrevious";
    case "a":
    case "A":
      return "onApprove";
    case "s":
    case "S":
      return "onSendBack";
    case "?":
      return "onHelp";
    default:
      return null;
  }
}

/**
 * Review queue keyboard shortcuts.
 *
 * "A" only ever opens the approval confirmation; publishing needs a click
 * (or Enter) on the dialog's confirm button. Shortcuts are ignored while the
 * teacher is typing, while any dialog or popover is open, with a modifier
 * key held, and on auto-repeat.
 */
export function useReviewShortcuts(enabled: boolean, handlers: ReviewShortcutHandlers) {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!enabled) return;
    if (event.defaultPrevented || event.repeat || event.isComposing) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (isEditableTarget(event.target) || isEditableTarget(document.activeElement)) return;
    if (overlayIsOpen()) return;

    const action = shortcutForKey(event.key);
    if (!action) return;
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
