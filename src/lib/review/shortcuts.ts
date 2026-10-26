// Pure helpers behind the review-queue keyboard shortcuts. No React, no DOM
// globals: the hook in src/components/review uses them, and so do the tests.

/** Minimal element shape, so the guard is testable without a DOM. */
export type ElementLike = {
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
export function ownsArrowKeys(target: unknown): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as ElementLike;
  if (typeof el.closest !== "function") return false;
  return Boolean(el.closest('[role="tablist"], [role="radiogroup"], [role="slider"], [role="toolbar"]'));
}

export type ReviewShortcutHandlers = {
  onNext: () => void;
  onPrevious: () => void;
  onApprove: () => void;
  onSendBack: () => void;
  onHelp: () => void;
};

export type ShortcutAction = keyof ReviewShortcutHandlers;

/** Map a key to a review action. */
/** Letter and symbol keys (not arrows): the ones a user can turn off (WCAG 2.1.4). */
export function isCharacterKey(key: string): boolean {
  return key.length === 1;
}

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
