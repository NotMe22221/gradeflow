// When a key press opens (or closes) the search palette. Pure, so the rules
// are unit-tested; the hook in src/components/command-palette applies them.
//
// Ctrl+K (Cmd+K on a Mac; either works) opens search, but never while someone
// is typing in a field, and never while another dialog, menu or listbox is
// open: the review queue's own shortcuts (J/K/A/S/?) and its confirmation
// dialogs keep the keyboard. Ctrl/Cmd+K inside the open palette closes it
// again.
//
// There is deliberately no single-key shortcut ("/"): a character key that
// works anywhere fires on speech input and stray presses, and WCAG 2.1.4
// would need a way to turn it off or remap it. A modifier chord needs neither.

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

  return null;
}

/** The selector for "another overlay is open" (Radix dialogs, menus, popovers, selects). */
export const OVERLAY_SELECTOR = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]';

/** "⌘" on Apple platforms, "Ctrl" elsewhere, for shortcut hints. */
export function modifierLabel(platform: string | undefined): "⌘" | "Ctrl" {
  return platform && /mac|iphone|ipad|ipod/i.test(platform) ? "⌘" : "Ctrl";
}

/** The search shortcut as a key hint: "⌘K" on Apple platforms, "Ctrl K" elsewhere. */
export function searchShortcutHint(modifier: "⌘" | "Ctrl"): string {
  return modifier === "⌘" ? "⌘K" : "Ctrl K";
}
