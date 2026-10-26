"use client";

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
      </DialogContent>
    </Dialog>
  );
}
