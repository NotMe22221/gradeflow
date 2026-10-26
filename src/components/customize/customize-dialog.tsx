"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  pickAppearance,
  applyAppearance,
  readAppearance,
  saveAppearance,
  useAppearance,
  type Appearance,
} from "@/components/customize/appearance";
import {
  ACCENT_OPTIONS,
  DENSITY_OPTIONS,
  PAPER_SIDE_OPTIONS,
  TEXT_SIZE_OPTIONS,
  THEME_OPTIONS,
} from "@/components/customize/options";
import { Check, LayoutDashboard, Monitor, Moon, PanelLeft, PanelRight, RotateCcw, Sun } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { resetAllPreferences, updatePreferences } from "@/lib/preferences/actions";
import { DEFAULT_PREFERENCES, type PaperSide, type Preferences, type Theme } from "@/lib/preferences/schema";
import { cn } from "@/lib/utils";

export const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon } as const satisfies Record<Theme, unknown>;

const WIDE_QUERY = "(min-width: 40rem)";
const UNDO_MS = 8000;

/** True from the sm breakpoint up: the panel is a side sheet there and a bottom sheet on phones. */
function useWide(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(WIDE_QUERY);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true
  );
}

/** Section headings (h3 under the sheet's h2 title), so screen reader users can jump between them. */
const sectionTitle = "font-sans text-[0.9375rem] font-medium text-foreground";

/**
 * Each choice is a label around a native radio that covers it invisibly, so
 * a click or tap lands on the radio itself and the label draws the look.
 */
const radioInput = "absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none rounded-[inherit] opacity-0";

/** In Windows high contrast (forced colors) backgrounds vanish, so the selected choice also gets an outline. */
const forcedSelected = "forced-colors:outline-2 forced-colors:-outline-offset-4";

/** Focus ring for a choice whose radio has keyboard focus. */
const choiceFocus = "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-inset";

/**
 * Customize: appearance (theme, accent, text size, density) and layout
 * (arranging Home, the paper side in To review). A side sheet on wide
 * screens, so the page stays visible as a live preview, and a bottom sheet on
 * phones. Every change applies at once and saves to the account; there is
 * no Save button. Each choice is a native radio group (arrow keys move
 * between options), labelled by its legend.
 */
export function CustomizeDialog({
  open,
  onOpenChange,
  preferences,
  role,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: Preferences;
  role: "TEACHER" | "STUDENT";
}) {
  const router = useRouter();
  const wide = useWide();
  const live = useAppearance();
  const ids = useId();

  // What the radios show: set at once on change, and synced from the page when it changes
  // elsewhere (quick toggle, a failed save reverting, the server re-rendering <html>).
  const [shown, setShown] = useState<Appearance>(() => pickAppearance(live));
  useEffect(() => {
    setShown({ theme: live.theme, accent: live.accent, textSize: live.textSize, density: live.density });
  }, [live.theme, live.accent, live.textSize, live.density]);

  const [paperSide, setPaperSide] = useState<PaperSide>(preferences.layout.reviewPaperSide);
  useEffect(() => setPaperSide(preferences.layout.reviewPaperSide), [preferences.layout.reviewPaperSide]);

  function change(patch: Partial<Appearance>) {
    setShown((current) => ({ ...current, ...patch }));
    void saveAppearance(patch);
  }

  async function changePaperSide(side: PaperSide) {
    const previous = paperSide;
    setPaperSide(side);
    const result = await updatePreferences({ layout: { reviewPaperSide: side } }).catch(() => null);
    if (!result?.ok) {
      setPaperSide(previous);
      toast.error(result?.error ?? "Your change couldn't be saved. Check your connection and try again.");
    }
  }

  function arrangeHome() {
    handleOpenChange(false);
    router.push(role === "TEACHER" ? "/dashboard?customize=1" : "/student?customize=1");
  }

  // After "Reset all settings": what to restore, until when. The sheet is modal, so the Undo
  // lives in its footer while it is open; closing the sheet hands it to a toast for the rest
  // of the 8 seconds.
  const [undo, setUndo] = useState<{ before: Preferences; until: number } | null>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const swapped = useRef(false);
  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(() => {
      // If Undo had focus, hand it to the Reset button that replaces it.
      swapped.current = Boolean(footerRef.current?.contains(document.activeElement));
      setUndo(null);
    }, Math.max(0, undo.until - Date.now()));
    return () => window.clearTimeout(timer);
  }, [undo]);
  // The pressed button is swapped for its counterpart (Reset <-> Undo): keep keyboard focus on it.
  const undoShown = undo !== null;
  useEffect(() => {
    if (!swapped.current) return;
    swapped.current = false;
    footerRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [undoShown]);

  function showAppearance(prefs: Preferences) {
    applyAppearance(pickAppearance(prefs));
    setShown(pickAppearance(prefs));
    setPaperSide(prefs.layout.reviewPaperSide);
  }

  async function resetAll() {
    const before: Preferences = {
      ...preferences,
      ...readAppearance(),
      layout: { ...preferences.layout, reviewPaperSide: paperSide },
    };
    showAppearance(DEFAULT_PREFERENCES);
    swapped.current = true;
    const result = await resetAllPreferences().catch(() => ({ ok: false }));
    if (!result.ok) {
      swapped.current = false;
      showAppearance(before);
      toast.error("Your settings couldn't be reset. Try again.");
      return;
    }
    setUndo({ before, until: Date.now() + UNDO_MS });
  }

  async function undoReset(before: Preferences) {
    swapped.current = true;
    setUndo(null);
    showAppearance(before);
    const restored = await updatePreferences({ ...pickAppearance(before), layout: before.layout }).catch(() => null);
    if (!restored?.ok) toast.error(restored?.error ?? "Your settings couldn't be restored.");
  }

  function handleOpenChange(next: boolean) {
    if (!next && undo && undo.until > Date.now()) {
      const { before, until } = undo;
      setUndo(null);
      toast("Settings reset to default", {
        duration: until - Date.now(),
        action: { label: "Undo", onClick: () => void undoReset(before) },
      });
    }
    onOpenChange(next);
  }

  const currentScale = TEXT_SIZE_OPTIONS.find((option) => option.value === shown.textSize)?.scale ?? 1;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        // A light scrim: the page behind is the live preview.
        overlayClassName="bg-scrim/40"
        className={cn("gap-0 p-0", wide ? "w-full sm:max-w-[26rem]" : "max-h-[90dvh]")}
        onOpenAutoFocus={(event) => {
          // Start on the selected theme (not the first radio), so Space never changes a setting by surprise.
          const checked = (event.currentTarget as HTMLElement | null)?.querySelector<HTMLInputElement>("input[type=radio]:checked");
          if (checked) {
            event.preventDefault();
            checked.focus();
          }
        }}
      >
        <SheetHeader className="gap-1 px-6 pt-6 pr-16 pb-2">
          <SheetTitle className="font-display text-[1.375rem] leading-tight font-normal">Customize</SheetTitle>
          <SheetDescription className="text-[0.875rem] leading-relaxed text-pretty">
            Changes show right away and are saved to your account.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-2 pb-8">
          {/* Theme */}
          <fieldset className="min-w-0">
            <legend>
              <h3 className={sectionTitle}>Theme</h3>
            </legend>
            <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-full border border-input">
              {THEME_OPTIONS.map((option, index) => {
                const Icon = THEME_ICONS[option.value];
                const checked = shown.theme === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "relative flex min-h-10 cursor-pointer items-center justify-center gap-2 px-2 py-2 text-sm font-medium transition-colors select-none",
                      index > 0 && "border-l border-input",
                      checked ? cn("bg-primary-soft text-primary-soft-foreground", forcedSelected) : "text-foreground hover:bg-foreground/[0.06]",
                      choiceFocus,
                      index === 0 && "rounded-l-full",
                      index === THEME_OPTIONS.length - 1 && "rounded-r-full"
                    )}
                  >
                    <input
                      type="radio"
                      name={`${ids}-theme`}
                      value={option.value}
                      checked={checked}
                      onChange={() => change({ theme: option.value })}
                      className={radioInput}
                    />
                    <Icon filled={checked} className="size-[1.125rem]" />
                    {option.label}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-[0.8125rem] text-muted-foreground">
              {shown.theme === "system"
                ? `Follows your device, which is set to ${live.resolved} right now.`
                : THEME_OPTIONS.find((option) => option.value === shown.theme)?.description}
            </p>
          </fieldset>

          {/* Accent color */}
          <fieldset className="@container mt-8 min-w-0">
            <legend>
              <h3 className={sectionTitle}>Accent color</h3>
            </legend>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">Buttons, links and the selected page in the menu.</p>
            <div className="mt-3 grid grid-cols-3 gap-x-1 gap-y-2 @xs:grid-cols-6">
              {ACCENT_OPTIONS.map((option) => {
                const checked = shown.accent === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-[0.8125rem] transition-colors select-none hover:bg-foreground/[0.04]",
                      choiceFocus
                    )}
                  >
                    <input
                      type="radio"
                      name={`${ids}-accent`}
                      value={option.value}
                      checked={checked}
                      onChange={() => change({ accent: option.value })}
                      className={radioInput}
                    />
                    {/* data-accent gives this circle that accent's palette (see globals.css). */}
                    <span
                      aria-hidden
                      data-accent={option.value}
                      className={cn(
                        "flex size-10 items-center justify-center rounded-full bg-[var(--primary-40)] text-primary-foreground ring-offset-2 ring-offset-popover dark:bg-[var(--primary-80)]",
                        checked && "ring-2 ring-foreground"
                      )}
                    >
                      {checked ? <Check className="size-5" /> : null}
                    </span>
                    <span className={cn(checked ? "font-medium text-foreground" : "text-muted-foreground")}>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Text size */}
          <fieldset className="mt-8 min-w-0">
            <legend>
              <h3 className={sectionTitle}>Text size</h3>
            </legend>
            <div className="mt-3 grid grid-cols-4 overflow-hidden rounded-xl border border-input">
              {TEXT_SIZE_OPTIONS.map((option, index) => {
                const checked = shown.textSize === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "relative flex min-h-16 cursor-pointer flex-col items-center justify-end gap-1 px-1 pt-2 pb-2 transition-colors select-none",
                      index > 0 && "border-l border-input",
                      checked ? cn("bg-primary-soft text-primary-soft-foreground", forcedSelected) : "text-foreground hover:bg-foreground/[0.06]",
                      choiceFocus
                    )}
                  >
                    <input
                      type="radio"
                      name={`${ids}-text-size`}
                      value={option.value}
                      checked={checked}
                      onChange={() => change({ textSize: option.value })}
                      className={radioInput}
                    />
                    {/* Drawn at the size the option gives, whatever the current setting is. */}
                    <span
                      aria-hidden
                      className="font-display leading-none font-medium"
                      style={{ fontSize: `${(1.25 * option.scale) / currentScale}rem` }}
                    >
                      Aa
                    </span>
                    <span className={cn("text-xs", checked ? "font-medium" : "text-muted-foreground")}>{option.label}</span>
                  </label>
                );
              })}
            </div>
            <div aria-hidden className="mt-3 flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: "var(--class-green-accent)" }} />
              <span className="min-w-0">
                <span className="block truncate text-[0.9375rem] font-medium text-foreground">Lab report: Osmosis in potato cores</span>
                <span className="block truncate text-[0.8125rem] text-muted-foreground">Period 3 Biology · Due tomorrow, 11:59 PM</span>
              </span>
            </div>
          </fieldset>

          {/* Density */}
          <fieldset className="mt-8 min-w-0">
            <legend>
              <h3 className={sectionTitle}>Density</h3>
            </legend>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">Lists and tables only. Dialogs and forms keep their spacing.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {DENSITY_OPTIONS.map((option) => {
                const checked = shown.density === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "relative flex cursor-pointer flex-col gap-3 rounded-xl border p-3 transition-colors select-none",
                      checked ? cn("border-primary bg-primary-soft/50", forcedSelected) : "border-border hover:bg-foreground/[0.04]",
                      choiceFocus
                    )}
                  >
                    <input
                      type="radio"
                      name={`${ids}-density`}
                      value={option.value}
                      checked={checked}
                      onChange={() => change({ density: option.value })}
                      aria-labelledby={`${ids}-density-${option.value}`}
                      aria-describedby={`${ids}-density-${option.value}-hint`}
                      className={radioInput}
                    />
                    <DensityPicture compact={option.value === "compact"} />
                    <span className="min-w-0 pr-5">
                      <span id={`${ids}-density-${option.value}`} className="block text-sm font-medium text-foreground">
                        {option.label}
                      </span>
                      <span id={`${ids}-density-${option.value}-hint`} className="block text-[0.8125rem] text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                    {checked ? <Check aria-hidden className="absolute right-2.5 bottom-3 size-5 text-primary" /> : null}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Layout */}
          <section aria-labelledby={`${ids}-layout`} className="mt-8">
            <h3 id={`${ids}-layout`} className={sectionTitle}>
              Layout
            </h3>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl bg-secondary px-4 py-3.5">
              <div className="min-w-0 flex-1 basis-40">
                <p className="text-sm font-medium text-foreground">Home page</p>
                <p className="text-[0.8125rem] text-pretty text-muted-foreground">
                  Move, hide or show sections{role === "TEACHER" ? " and reorder your classes" : ""}.
                </p>
              </div>
              <Button type="button" variant="tonal" size="sm" onClick={arrangeHome}>
                <LayoutDashboard />
                Arrange Home
              </Button>
            </div>

            {role === "TEACHER" ? (
              <fieldset className="mt-5 min-w-0">
                <legend>
                  <h4 className="font-sans text-sm font-medium text-foreground">Student paper in To review</h4>
                </legend>
                <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">On wide screens, beside the rubric.</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {PAPER_SIDE_OPTIONS.map((option) => {
                    const checked = paperSide === option.value;
                    const Icon = option.value === "left" ? PanelLeft : PanelRight;
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "relative flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors select-none",
                          checked
                            ? cn("border-primary bg-primary-soft/50 font-medium text-foreground", forcedSelected)
                            : "border-border text-foreground hover:bg-foreground/[0.04]",
                          choiceFocus
                        )}
                      >
                        <input
                          type="radio"
                          name={`${ids}-paper-side`}
                          value={option.value}
                          checked={checked}
                          onChange={() => void changePaperSide(option.value)}
                          className={radioInput}
                        />
                        <Icon filled={checked} className={cn("size-5 shrink-0", checked ? "text-primary" : "text-muted-foreground")} />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}
          </section>
        </div>

        <div className="flex min-h-16 items-center justify-between gap-3 border-t border-border px-4 py-3">
          {/* Announced politely when the reset happens. */}
          <div ref={footerRef} role="status" className="flex min-w-0 items-center gap-1">
            {undo ? (
              <>
                <span className="pl-2 text-sm text-foreground">Back to default settings.</span>
                <Button type="button" variant="text" size="sm" onClick={() => void undoReset(undo.before)}>
                  Undo
                </Button>
              </>
            ) : (
              <Button type="button" variant="text" onClick={() => void resetAll()}>
                <RotateCcw />
                Reset all settings
              </Button>
            )}
          </div>
          <SheetClose asChild>
            <Button type="button">Done</Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** A tiny list, roomy or tight, to show what density changes. Decorative. */
function DensityPicture({ compact }: { compact: boolean }) {
  const rows = compact ? 4 : 3;
  return (
    <span aria-hidden className={cn("flex h-14 flex-col justify-center rounded-lg bg-secondary px-2.5", compact ? "gap-1" : "gap-2")}>
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="flex items-center gap-1.5">
          <span className={cn("shrink-0 rounded-full bg-muted-foreground/45", compact ? "size-1.5" : "size-2")} />
          <span
            className={cn("h-1.5 rounded-full bg-muted-foreground/30", index % 2 ? "w-3/5" : "w-4/5")}
          />
        </span>
      ))}
    </span>
  );
}
