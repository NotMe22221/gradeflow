"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Check, LayoutDashboard, RotateCcw } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { updatePreferences } from "@/lib/preferences/actions";
import type { LayoutSurface, PreferencesPatch, SectionLayout } from "@/lib/preferences/schema";
import { cn } from "@/lib/utils";

import { sameLayout } from "./model";

/*
 * Edit mode for a page's arrangement: Home sections (main and side column,
 * hidden or shown) and the class card order. Arranging is always an explicit
 * mode: the Arrange button (or ?customize=1 in the URL, which Customize >
 * Arrange Home links to) opens a sticky bar, every change is a draft, Done
 * saves it to the user's preferences (optimistically, reverting with a toast
 * if the save fails), and Cancel throws it away. Outside edit mode nothing on
 * the page can be dragged.
 *
 * While the bar is up its height is published as --edit-bar-h on <html>, which
 * html scroll-padding-top adds in, so a focused or scrolled-to control never
 * lands under it (WCAG 2.4.11).
 */

type Arrangement = { layout: SectionLayout | null; classOrder: string[] };

export type LayoutEditorValue = {
  /** The Home being arranged, or null on a page that only arranges class cards. */
  surface: LayoutSurface | null;
  editing: boolean;
  /** What the page shows: the draft while editing, else the saved arrangement. */
  layout: SectionLayout | null;
  classOrder: string[];
  /** Change the draft (editing only). */
  setLayout: (update: (current: SectionLayout) => SectionLayout) => void;
  setClassOrder: (update: (current: string[]) => string[]) => void;
  /** Say something to screen readers (a polite live region). */
  announce: (message: string) => void;
  start: () => void;
  /** The Arrange button, which gets focus back when editing ends. */
  arrangeButtonRef: React.RefObject<HTMLButtonElement | null>;
};

const EditorContext = createContext<LayoutEditorValue | null>(null);

/** The page's layout editor, or null outside a LayoutEditorProvider. */
export function useLayoutEditor(): LayoutEditorValue | null {
  return useContext(EditorContext);
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function LayoutEditorProvider({
  surface = null,
  layout = null,
  defaultLayout = null,
  classOrder,
  label,
  startEditing = false,
  children,
}: {
  surface?: LayoutSurface | null;
  /** The saved section layout (server-normalized). */
  layout?: SectionLayout | null;
  /** What "Reset to default" restores. */
  defaultLayout?: SectionLayout | null;
  /** The saved class card order. */
  classOrder: string[];
  /** What is being arranged, for the bar: "your Home", "your classes". */
  label: string;
  /** Open in edit mode (the page was opened with ?customize=1). */
  startEditing?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // The saved arrangement follows the server's props (after a save, or a
  // change from another tab), and moves ahead of them optimistically on Done.
  const propsKey = JSON.stringify([layout, classOrder]);
  const [saved, setSaved] = useState<Arrangement>({ layout, classOrder });
  const [syncedKey, setSyncedKey] = useState(propsKey);
  if (propsKey !== syncedKey) {
    setSyncedKey(propsKey);
    setSaved({ layout, classOrder });
  }

  /** The draft while editing; null otherwise. */
  const [draft, setDraft] = useState<Arrangement | null>(null);
  const editing = draft !== null;
  const editingRef = useRef(editing);
  const session = useRef(0);
  const [, startTransition] = useTransition();

  const arrangeButtonRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const barHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusAfterToggle = useRef(false);

  // The bar is sticky just under the app bar. Publish its height (plus that
  // 0.5rem offset) so html scroll-padding-top keeps focused and scrolled-to
  // controls clear of it. It wraps, so its height follows the width and the
  // text size: measure it rather than assume one.
  useEffect(() => {
    const bar = barRef.current;
    if (!editing || !bar) return;
    const root = document.documentElement;
    const sync = () => {
      const height = Math.ceil(bar.getBoundingClientRect().height);
      root.style.setProperty("--edit-bar-h", `calc(${height}px + 0.5rem)`);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--edit-bar-h");
    };
  }, [editing]);

  // "Reset to default" offers Undo in a toast, which only means something
  // while that edit session is open: Done, Cancel or leaving the page closes it.
  const resetToastId = useRef<string | number | undefined>(undefined);
  const dismissResetToast = useCallback(() => {
    if (resetToastId.current !== undefined) toast.dismiss(resetToastId.current);
    resetToastId.current = undefined;
  }, []);
  useEffect(() => dismissResetToast, [dismissResetToast]);

  const [message, setMessage] = useState("");
  const messageTimer = useRef<number | undefined>(undefined);
  const announce = useCallback((text: string) => {
    // Clear first, so the same words twice in a row are still read out.
    setMessage("");
    window.clearTimeout(messageTimer.current);
    messageTimer.current = window.setTimeout(() => setMessage(text), 60);
  }, []);
  useEffect(() => () => window.clearTimeout(messageTimer.current), []);

  useEffect(() => {
    editingRef.current = editing;
    if (!focusAfterToggle.current) return;
    focusAfterToggle.current = false;
    if (editing) barHeadingRef.current?.focus();
    else arrangeButtonRef.current?.focus();
  }, [editing]);

  const start = useCallback(() => {
    if (editingRef.current) return;
    session.current += 1;
    focusAfterToggle.current = true;
    setDraft({ layout: saved.layout, classOrder: saved.classOrder });
    announce(`Arranging ${label}. Drag a handle, or use the move buttons. Press Done to save.`);
  }, [saved, label, announce]);

  // ?customize=1 opens edit mode once per visit to that URL, then leaves the URL clean.
  const startHandled = useRef(false);
  useEffect(() => {
    if (!startEditing) {
      startHandled.current = false;
      return;
    }
    if (startHandled.current) return;
    startHandled.current = true;
    start();
    const params = new URLSearchParams(window.location.search);
    params.delete("customize");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [startEditing, start, router, pathname]);

  const setLayout = useCallback((update: (current: SectionLayout) => SectionLayout) => {
    setDraft((current) => (current?.layout ? { ...current, layout: update(current.layout) } : current));
  }, []);

  const setClassOrder = useCallback((update: (current: string[]) => string[]) => {
    setDraft((current) => (current ? { ...current, classOrder: update(current.classOrder) } : current));
  }, []);

  function cancel() {
    dismissResetToast();
    focusAfterToggle.current = true;
    setDraft(null);
    announce("Cancelled. Nothing changed.");
  }

  function done() {
    if (!draft) return;
    dismissResetToast();
    const patch: { layout: NonNullable<PreferencesPatch["layout"]> } = { layout: {} };
    if (surface && draft.layout && saved.layout && !sameLayout(draft.layout, saved.layout)) {
      patch.layout[surface] = draft.layout;
    }
    if (!sameOrder(draft.classOrder, saved.classOrder)) patch.layout.classOrder = draft.classOrder;

    focusAfterToggle.current = true;
    setDraft(null);
    if (Object.keys(patch.layout).length === 0) {
      announce("Done. Nothing changed.");
      return;
    }

    const previous = saved;
    setSaved({ layout: draft.layout ?? saved.layout, classOrder: draft.classOrder });
    announce("Saved your arrangement.");
    startTransition(async () => {
      let ok = false;
      try {
        ok = (await updatePreferences(patch)).ok;
      } catch {
        ok = false;
      }
      if (!ok) {
        setSaved(previous);
        toast.error("Your arrangement wasn't saved", {
          description: "Check your connection and try again.",
        });
      }
    });
  }

  function reset() {
    if (!draft) return;
    const before = draft;
    const id = session.current;
    let text: string;
    if (surface && defaultLayout) {
      setDraft({ ...draft, layout: defaultLayout });
      text = "Sections are back in their default places.";
    } else {
      setDraft({ ...draft, classOrder: [] });
      text = "Classes are back in the order they were created.";
    }
    announce(text);
    dismissResetToast();
    resetToastId.current = toast(text, {
      description: "Press Done to keep it.",
      duration: 8000,
      action: {
        label: "Undo",
        onClick: () => {
          if (editingRef.current && session.current === id) setDraft(before);
        },
      },
    });
  }

  const value = useMemo<LayoutEditorValue>(
    () => ({
      surface,
      editing,
      layout: (draft ?? saved).layout,
      classOrder: (draft ?? saved).classOrder,
      setLayout,
      setClassOrder,
      announce,
      start,
      arrangeButtonRef,
    }),
    [surface, editing, draft, saved, setLayout, setClassOrder, announce, start]
  );

  return (
    <EditorContext.Provider value={value}>
      {editing ? (
        <div
          ref={barRef}
          role="region"
          aria-labelledby="layout-editor-heading"
          className="sticky top-[calc(var(--app-bar-h,4rem)+0.5rem)] z-30 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border bg-card py-2 pr-2 pl-4 shadow-raised"
        >
          <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
            <LayoutDashboard className="size-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <h2
                id="layout-editor-heading"
                ref={barHeadingRef}
                tabIndex={-1}
                className="font-sans text-[0.9375rem] leading-6 font-medium text-foreground outline-none"
              >
                Arranging {label}
              </h2>
              <p className="text-[0.8125rem] leading-5 text-pretty text-muted-foreground max-sm:hidden">
                Drag a handle or use the move buttons. Nothing changes until you press Done.
              </p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
            <Button
              type="button"
              variant="text"
              onClick={reset}
              aria-label={surface ? "Reset to default" : "Reset order"}
              className="max-sm:px-3 max-sm:has-[>svg]:px-3"
            >
              <RotateCcw className="max-sm:hidden" aria-hidden />
              <span>
                Reset<span className="max-[480px]:hidden">{surface ? " to default" : " order"}</span>
              </span>
            </Button>
            <Button type="button" variant="ghost" onClick={cancel} className="max-sm:px-4">
              Cancel
            </Button>
            <Button type="button" onClick={done}>
              <Check aria-hidden />
              Done
            </Button>
          </div>
        </div>
      ) : null}
      {children}
      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </EditorContext.Provider>
  );
}

/**
 * The quiet entry point beside the page title: "Arrange" (the layout), never
 * "Customize", which is the account menu's appearance panel. Hidden (keeping
 * its space) while editing.
 */
export function ArrangeButton({
  children = "Arrange",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const editor = useLayoutEditor();
  if (!editor) return null;
  return (
    <Button
      ref={editor.arrangeButtonRef}
      type="button"
      variant="outline"
      size="sm"
      onClick={editor.start}
      className={cn("text-foreground", editor.editing && "invisible", className)}
    >
      <LayoutDashboard aria-hidden />
      {children}
    </Button>
  );
}

/**
 * Page content that is not part of the arrangement (the greeting, notices).
 * While editing it is dimmed and inert, so the bar and the sections are the
 * only things to act on.
 */
export function FixedRegion({ className, children }: { className?: string; children: React.ReactNode }) {
  const editing = useLayoutEditor()?.editing ?? false;
  return (
    <div
      inert={editing}
      className={cn("transition-opacity duration-200 motion-reduce:transition-none", editing && "opacity-55", className)}
    >
      {children}
    </div>
  );
}
