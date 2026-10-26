"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Sun } from "@/components/icons";

import { cn } from "@/lib/utils";

/*
 * Student work (typed papers, transcriptions, page photos) sits on a light
 * "paper" sheet in both themes and is never inverted. In dark mode the page
 * tokens hold dark-theme values, so everything drawn ON the sheet uses the
 * classes below: they keep the light-theme look on the sheet, mixed from
 * theme tokens (no fixed colors).
 *
 * SHEET_SCOPE goes on an ancestor of the marks (and of any legend swatches
 * that must match them). In dark mode it re-points --highlight and
 * --highlight-strong at light amber, so bg-highlight, the number chips and the
 * evidence flash (animate-flash reads the same variables) stay legible on the
 * sheet. Light mode keeps the stock tokens.
 */
export const SHEET_SCOPE =
  "dark:[--highlight:color-mix(in_oklab,var(--warning)_38%,var(--paper))] dark:[--highlight-strong:color-mix(in_oklab,var(--warning)_78%,var(--paper))]";

/** The sheet itself: paper fill and ink in both themes. */
export const SHEET = "bg-paper text-paper-foreground";

/** Text flagged as addressed to the grader, on the sheet: fill, ink and outline. */
export const FLAG_FILL = "bg-danger-soft dark:bg-[color-mix(in_oklab,var(--danger)_45%,var(--paper))]";
export const FLAG_INK = "text-danger-soft-foreground dark:text-danger-soft";
export const FLAG_RING = "ring-danger/30 dark:ring-danger-soft/50";
export const FLAG_FOCUS_RING = "focus:ring-danger/60 dark:focus:ring-danger-soft";

/** The number chip that ties a highlight to its rubric row (same look on and off the sheet). */
export const MARK_CHIP = "bg-highlight-strong text-paper-foreground";

/** Applied to the sheet or a photo when the viewer dims the page; only takes effect in dark mode. */
export const DIMMED = "dark:brightness-85";

// --- "Dim page" (a per-viewer convenience, kept in this browser only) --------

const STORAGE_KEY = "gradesmart:review:dim-page";
const listeners = new Set<() => void>();
/** In-memory value, so the toggle still works when storage is blocked. */
let memory: boolean | null = null;

function readDim(): boolean {
  if (memory !== null) return memory;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    memory = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Whether student work is dimmed (dark mode only), and a setter. Off on the server. */
export function usePaperDim(): [boolean, (dim: boolean) => void] {
  const dim = useSyncExternalStore(subscribe, readDim, () => false);
  const setDim = useCallback((next: boolean) => {
    memory = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Storage blocked (private window, previews): the in-memory value still applies.
    }
    listeners.forEach((listener) => listener());
  }, []);
  return [dim, setDim];
}

/**
 * "Dim page": lowers the brightness of the white sheet and the page photos so
 * they don't glare against a dark screen. Only shown in dark mode, where it
 * applies; the paper itself is never inverted.
 */
export function DimPageToggle({ className }: { className?: string }) {
  const [dim, setDim] = usePaperDim();
  return (
    <button
      type="button"
      aria-pressed={dim}
      onClick={() => setDim(!dim)}
      className={cn(
        "hidden h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium text-muted-foreground transition-colors outline-none hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-secondary aria-pressed:text-secondary-foreground dark:inline-flex",
        className
      )}
    >
      <Sun className="size-4" filled={dim} aria-hidden />
      Dim page
    </button>
  );
}
