// When a key press opens (or closes) the search palette. Pure, so the rules
// are unit-tested; the hook in src/components/command-palette applies them.
//
// Ctrl+K (Cmd+K on a Mac; either works) and "/" open search, but never while
// someone is typing in a field, and never while another dialog, menu or
// listbox is open: the review queue's own shortcuts (J/K/A/S/?) and its
// confirmation dialogs keep the keyboard. Ctrl/Cmd+K inside the open palette
// closes it again.

import { isEditableTarget } from "@/lib/review/shortcuts";

export type ShortcutKeyEvent = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  defaultPrevented?: boolean;
  target?: unknown;
};

export type ShortcutContext = {
  paletteOpen: boolean;
  /** Any other dialog, menu, popover or listbox is open. */
  overlayOpen: boolean;
  /** document.activeElement, checked as well as the event target. */
  activeElement?: unknown;
};

export type ShortcutResult = "open" | "close" | null;

export function paletteShortcut(event: ShortcutKeyEvent, context: ShortcutContext): ShortcutResult {
  if (event.isComposing || event.repeat || event.defaultPrevented) return null;
  const typing = isEditableTarget(event.target) || isEditableTarget(context.activeElement);

  const modK = (event.key === "k" || event.key === "K") && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
  if (modK) {
    if (context.paletteOpen) return "close";
    if (context.overlayOpen || typing) return null;
    return "open";
  }

  const slash = event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey;
  if (slash) {
    // In the open palette "/" is just a character in the search field.
    if (context.paletteOpen || context.overlayOpen || typing) return null;
    return "open";
  }
  return null;
}

/** The selector for "another overlay is open" (Radix dialogs, menus, popovers, selects). */
export const OVERLAY_SELECTOR = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]';

/** "⌘" on Apple platforms, "Ctrl" elsewhere, for shortcut hints. */
export function modifierLabel(platform: string | undefined): "⌘" | "Ctrl" {
  return platform && /mac|iphone|ipad|ipod/i.test(platform) ? "⌘" : "Ctrl";
}
