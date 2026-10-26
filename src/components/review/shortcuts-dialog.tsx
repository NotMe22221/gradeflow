"use client";

import { useId } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

const SHORTCUTS: { keys: string[][]; label: string }[] = [
  { keys: [["J"], ["→"]], label: "Next paper" },
  { keys: [["K"], ["←"]], label: "Previous paper" },
  { keys: [["A"]], label: "Approve & return (asks you to confirm)" },
  { keys: [["S"]], label: "Send back with a note" },
  { keys: [["?"]], label: "Show these shortcuts" },
  { keys: [["Esc"]], label: "Close a dialog" },
];

export function ShortcutsDialog({
  open,
  onOpenChange,
  restoreFocus,
  singleKeys,
  onSingleKeysChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opened by a key or a button, not a DialogTrigger, so Radix has nowhere to send focus back. */
  restoreFocus: () => void;
  /** Whether letter shortcuts (J, K, A, S, ?) are on. Arrow keys always work. */
  singleKeys: boolean;
  onSingleKeysChange: (next: boolean) => void;
}) {
  const toggleId = useId();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Shortcuts pause while you type in a field. A only opens the confirmation, so a stray key never
            returns a grade.
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <span className="text-foreground">{shortcut.label}</span>
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                {shortcut.keys.map((combo, index) => (
                  <span key={index} className="flex items-center gap-1.5">
                    {index > 0 ? <span>or</span> : null}
                    {combo.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
        {/* WCAG 2.1.4: single-letter shortcuts can be turned off (speech input, some screen readers). */}
        <div className="flex items-start gap-3 rounded-xl border border-border px-4 py-3">
          <input
            id={toggleId}
            type="checkbox"
            role="switch"
            checked={singleKeys}
            onChange={(event) => onSingleKeysChange(event.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[var(--primary)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-describedby={`${toggleId}-hint`}
          />
          <div className="min-w-0">
            <label htmlFor={toggleId} className="text-sm font-medium text-foreground">
              Single-key shortcuts
            </label>
            <p id={`${toggleId}-hint`} className="text-xs leading-5 text-muted-foreground">
              J, K, A, S and ?. Turn them off if you use speech input or a screen reader. The arrow keys and the
              buttons always work. Saved to your account.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
