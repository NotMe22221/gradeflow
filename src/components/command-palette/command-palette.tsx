"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { isInPage, prepareNavigation, showInPage } from "@/components/app-shell/destination";
import { pathOf } from "@/components/app-shell/nav-model";
import { overlayHistory } from "@/components/app-shell/overlay-history";
import { notifyLocationChange } from "@/components/app-shell/use-location-hash";
import { ClassAvatar } from "@/components/classroom/class-avatar";
import { AssignmentIcon } from "@/components/classwork/assignment-icon";
import { readRecent, writeRecent } from "@/components/command-palette/recent-storage";
import { useModifierLabel } from "@/components/command-palette/use-modifier-label";
import { useSearchIndex } from "@/components/command-palette/use-search-index";
import { saveAppearance, useAppearance } from "@/components/customize/appearance";
import {
  ArrowLeft,
  ChartColumn,
  FactCheck,
  Flag,
  GraduationCap,
  House,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  Monitor,
  Moon,
  Palette,
  Camera,
  FileText,
  Plus,
  ScanLine,
  Search,
  Sun,
  Table2,
  X,
  type IconComponent,
} from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";
import { dueLabel } from "@/lib/classroom/due";
import { actionsFor, indexItems, pagesFor, SEARCH_LABELS } from "@/lib/search/catalog";
import { canBeRecent, countResults, highlight, pushRecent, searchGroups } from "@/lib/search/rank";
import type { SearchIcon, SearchItem, SearchRole } from "@/lib/search/types";
import { classTheme } from "@/lib/ui/class-theme";
import { cn } from "@/lib/utils";


const ICONS: Record<SearchIcon, IconComponent> = {
  home: House,
  classes: GraduationCap,
  review: FactCheck,
  todo: ListChecks,
  goals: Flag,
  gradebook: Table2,
  insights: ChartColumn,
  scanner: Camera,
  create: FileText,
  "create-test": ScanLine,
  "theme-dark": Moon,
  "theme-light": Sun,
  "theme-system": Monitor,
  customize: Palette,
  arrange: LayoutDashboard,
};

const KIND_LABELS: Record<SearchItem["kind"], string> = {
  class: "Class",
  assignment: "Assignment",
  student: "Student",
  page: "Page",
  action: "Action",
};

function Highlighted({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlight(text, query).map((segment, index) =>
        segment.match ? (
          <mark key={index} className="bg-transparent font-semibold text-inherit">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  );
}

function Leading({ item }: { item: SearchItem }) {
  if (item.kind === "class") return <ClassAvatar name={item.title} />;
  if (item.kind === "student") return <Avatar name={item.title} className="size-8" />;
  if (item.kind === "assignment") {
    return (
      <AssignmentIcon
        isTest={item.assignmentKind === "TEST"}
        color={classTheme({ name: item.className ?? item.title }).color}
        className="size-8 [&_svg]:size-[1.125rem]"
      />
    );
  }
  const Icon = item.icon ? ICONS[item.icon] : Plus;
  return (
    <span aria-hidden className="flex size-8 shrink-0 items-center justify-center text-muted-foreground group-data-[selected=true]/item:text-current">
      <Icon className="size-5" />
    </span>
  );
}

function subtitleFor(item: SearchItem, now: Date): string | undefined {
  if (item.kind === "assignment") {
    const due = item.dueDate ? dueLabel(new Date(item.dueDate), now, { style: "short" }) : "No due date";
    return [item.className, due].filter(Boolean).join(" · ");
  }
  return item.subtitle;
}

/**
 * Search and command palette (cmdk on a Radix dialog). Finds the viewer's
 * classes, assignments and, for teachers, students in their own classes
 * (from /api/search, scoped on the server), plus pages and actions such as
 * creating an assignment, switching the theme, or opening Customize.
 *
 * Full screen on phones, a docked panel from 600px. Before typing it shows
 * recent picks, classes, pages and suggested actions. The input is an ARIA
 * combobox controlling a listbox of grouped options; arrow keys move, Enter
 * opens, Esc closes (cmdk and Radix handle these). Matching and ranking are
 * pure helpers in src/lib/search, so filtering is instant.
 */
export function CommandPalette({
  open,
  onOpenChange,
  role,
  userId,
  onCustomize,
  fallbackFocus,
  showGoals = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: SearchRole;
  userId: string;
  /** Opens the Customize panel (after this dialog has closed). */
  onCustomize: () => void;
  /** Where focus goes on close if the element focused before opening is gone (the search button). */
  fallbackFocus?: () => HTMLElement | null;
  /** Students: offer the goal planner (it's on Home only with classes, and when not hidden). */
  showGoals?: boolean;
}) {
  const router = useRouter();
  const appearance = useAppearance();
  const { index, status, retry } = useSearchIndex(userId, open);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const afterClose = useRef<(() => void) | null>(null);
  // Opened by a shortcut or a button, not a DialogTrigger, so Radix has nowhere to return focus:
  // remember what had it (layout effect: before the dialog moves focus to the input).
  const returnFocus = useRef<HTMLElement | null>(null);
  const [now, setNow] = useState(() => new Date());
  const modifier = useModifierLabel();

  // Each open starts fresh, before the first paint (so a previous query never flashes).
  useLayoutEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery("");
    setRecent(readRecent(userId));
    setNow(new Date());
  }, [open, userId]);

  const items = useMemo<SearchItem[]>(
    () => [
      ...(index ? indexItems(index) : []),
      ...pagesFor(role).filter((page) => showGoals || page.key !== "page:goals"),
      ...actionsFor(role, index?.classes ?? [], { theme: appearance.theme, resolvedTheme: appearance.resolved }),
    ],
    [index, role, showGoals, appearance.theme, appearance.resolved]
  );
  const groups = useMemo(() => searchGroups(items, query, { recent }), [items, query, recent]);
  const total = countResults(groups);

  const searching = query.trim().length > 0;
  const loading = status === "loading" && !index;

  // A short, polite summary for screen readers, once typing pauses.
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      if (!searching) setAnnouncement("");
      else if (loading) setAnnouncement("Loading results");
      else setAnnouncement(total === 0 ? "No results" : `${total} ${total === 1 ? "result" : "results"}`);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [open, searching, loading, total]);

  function run(item: SearchItem) {
    if (canBeRecent(item)) {
      const next = pushRecent(recent, item.key);
      setRecent(next);
      writeRecent(userId, next);
    }
    if (item.command?.type === "theme") {
      void saveAppearance({ theme: item.command.theme });
      onOpenChange(false);
      return;
    }
    if (item.command?.type === "customize") {
      afterClose.current = onCustomize;
      onOpenChange(false);
      return;
    }
    if (item.href) {
      const href = item.href;
      if (isInPage(href)) {
        // A section of this page (Goal planner on Home): move once the dialog, its scroll lock
        // and its focus return are gone, or the page lands mid-way and focus snaps back here.
        afterClose.current = () => void overlayHistory.settled().then(() => showInPage(href));
        onOpenChange(false);
        return;
      }
      if (pathOf(href) === window.location.pathname) {
        // This page with another query (Arrange Home on Home): after closing, so the page's own
        // focus (the "Arranging" bar) isn't taken back. Replace: it's still the same page.
        afterClose.current = () =>
          void overlayHistory.settled().then(() => {
            router.replace(href);
            notifyLocationChange();
          });
        onOpenChange(false);
        return;
      }
      prepareNavigation(href);
      // The full-screen search holds a history entry of its own on phones: the new page replaces
      // it, so Back from there returns to the page search was opened on.
      if (overlayHistory.takeOver()) router.replace(href);
      else router.push(href);
      onOpenChange(false);
      notifyLocationChange();
    }
  }

  const label = SEARCH_LABELS[role];

  // cmdk fills in aria-activedescendant only once the selection moves by key, so a screen
  // reader would hear nothing about the top result while typing. Keep the combobox pointing
  // at whichever option is highlighted (cmdk's own value wins whenever it sets one).
  const observer = useRef<MutationObserver | null>(null);
  const contentRef = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node) return;
    const sync = () => {
      const input = node.querySelector("[cmdk-input]");
      if (!input) return;
      const id = node.querySelector('[cmdk-item][aria-selected="true"]')?.id;
      if (id) {
        if (input.getAttribute("aria-activedescendant") !== id) input.setAttribute("aria-activedescendant", id);
      } else if (input.hasAttribute("aria-activedescendant")) {
        input.removeAttribute("aria-activedescendant");
      }
    };
    observer.current = new MutationObserver(sync);
    observer.current.observe(node, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-selected"] });
    sync();
  }, []);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          ref={contentRef}
          data-command-palette=""
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const saved = returnFocus.current;
            returnFocus.current = null;
            // While the dialog faded out, the page it opened may already have moved focus on
            // purpose (a fast page load, a section revealing itself). Leave it there; restore
            // only when focus fell to <body> because the dialog went away.
            const current = document.activeElement;
            const pageTookFocus =
              current instanceof HTMLElement &&
              current !== document.body &&
              current.isConnected &&
              !current.closest("[data-command-palette]");
            if (!pageTookFocus) {
              const target = saved?.isConnected && saved !== document.body ? saved : fallbackFocus?.();
              // Without scrolling: it was on screen when search opened, and the search button sits
              // in the sticky app bar, which html scroll-padding would otherwise scroll the page to.
              target?.focus({ preventScroll: true });
            }
            // Customize (and in-page moves) run after focus is back, so closing Customize returns there too.
            const next = afterClose.current;
            afterClose.current = null;
            if (next) window.setTimeout(next, 0);
          }}
          className={cn(
            "fixed inset-0 z-50 flex flex-col bg-popover pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-popover-foreground outline-none",
            "duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "min-[37.5rem]:inset-auto min-[37.5rem]:top-[max(4.5rem,10dvh)] min-[37.5rem]:left-1/2 min-[37.5rem]:max-h-[min(38rem,calc(100dvh-6rem))] min-[37.5rem]:w-[min(42rem,calc(100vw-2rem))] min-[37.5rem]:-translate-x-1/2 min-[37.5rem]:overflow-hidden min-[37.5rem]:rounded-[1.75rem] min-[37.5rem]:pt-0 min-[37.5rem]:pb-0 min-[37.5rem]:shadow-raised min-[37.5rem]:data-[state=open]:zoom-in-[0.98]"
          )}
        >
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {role === "TEACHER"
              ? "Find a class, assignment, student or page, or run an action."
              : "Find a class, assignment or page, or run an action."}{" "}
            Use the up and down arrow keys to move through the results and Enter to open one.
          </DialogPrimitive.Description>

          <Command
            label={label}
            shouldFilter={false}
            loop
            vimBindings={false}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div
              className={cn(
                "relative flex h-16 shrink-0 items-center gap-1 border-b border-border px-1",
                "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary after:opacity-0 after:transition-opacity focus-within:after:opacity-100",
                "min-[37.5rem]:h-14 min-[37.5rem]:px-3"
              )}
            >
              <DialogPrimitive.Close
                aria-label="Close search"
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-full text-foreground outline-none hover:bg-foreground/[0.06] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-hidden forced-colors:focus-visible:-outline-offset-2",
                  "min-[37.5rem]:hidden"
                )}
              >
                <ArrowLeft className="size-6" aria-hidden />
              </DialogPrimitive.Close>
              <Search className={cn("hidden size-5 text-muted-foreground", "min-[37.5rem]:mx-1 min-[37.5rem]:block")} aria-hidden />
              <Command.Input
                ref={inputRef}
                value={query}
                onValueChange={setQuery}
                placeholder={label}
                // 16px or more on phones, so iOS never zooms the page on focus.
                className={cn(
                  "h-12 min-w-0 flex-1 bg-transparent px-2 text-[max(1rem,16px)] text-foreground outline-none placeholder:text-muted-foreground",
                  "min-[37.5rem]:text-[1rem]"
                )}
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-hidden forced-colors:focus-visible:-outline-offset-2"
                >
                  <X className="size-5" aria-hidden />
                </button>
              ) : null}
              <Kbd aria-hidden className={cn("mr-1 hidden", "min-[37.5rem]:inline-flex")}>
                Esc
              </Kbd>
            </div>

            {status === "error" ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-warning-soft px-4 py-2.5 text-[0.8125rem] text-warning-soft-foreground">
                <span className="min-w-0 flex-1 basis-56">
                  Couldn&apos;t load your classes and assignments. Pages and actions still work.
                </span>
                <button
                  type="button"
                  onClick={retry}
                  className="-my-1 rounded-full px-3 py-1.5 font-medium underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                >
                  Try again
                </button>
              </div>
            ) : null}

            {/* Outside the listbox, which may only hold options. */}
            {searching && total === 0 && !loading ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[0.9375rem] text-foreground">
                  No results for &ldquo;<span className="font-medium">{query.trim()}</span>&rdquo;
                </p>
                <p className="mx-auto mt-1 max-w-[40ch] text-[0.8125rem] text-pretty text-muted-foreground">
                  {role === "TEACHER"
                    ? "Try a class name, an assignment title or a student's name."
                    : "Try a class name or an assignment title."}
                </p>
              </div>
            ) : null}
            <Command.List
              label="Search results"
              className={cn(
                "min-h-0 flex-1 scroll-py-2 overflow-y-auto overscroll-contain px-2 pt-1 pb-3",
                "min-[37.5rem]:flex-initial"
              )}
            >
              {loading ? (
                <Command.Loading label="Loading classes and assignments">
                  <div className="flex items-center gap-3 px-3 py-3 text-[0.875rem] text-muted-foreground">
                    <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />
                    Loading your classes and assignments…
                  </div>
                </Command.Loading>
              ) : null}


              {(loading ? [] : groups).map((group) => (
                <Command.Group
                  key={group.id}
                  heading={group.heading}
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[0.75rem] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {group.items.map((item) => {
                    const subtitle = subtitleFor(item, now);
                    return (
                      <Command.Item
                        key={item.key}
                        value={item.key}
                        onSelect={() => run(item)}
                        className={cn(
                          "group/item flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-foreground outline-none select-none",
                          subtitle ? "min-h-14" : "min-h-12",
                          "data-[selected=true]:bg-primary-soft data-[selected=true]:text-primary-soft-foreground",
                          // outline-solid: outline-none above also zeroes the outline style that outline-2 reads.
                          "forced-colors:data-[selected=true]:outline-2 forced-colors:data-[selected=true]:outline-solid forced-colors:data-[selected=true]:-outline-offset-2"
                        )}
                      >
                        <Leading item={item} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.9375rem] leading-5">
                            <Highlighted text={item.title} query={query} />
                          </span>
                          {subtitle ? (
                            <span className="mt-0.5 block truncate text-[0.8125rem] leading-4 text-muted-foreground group-data-[selected=true]/item:text-current group-data-[selected=true]/item:opacity-80">
                              {subtitle}
                            </span>
                          ) : null}
                        </span>
                        {group.id === "recent" ? (
                          <span aria-hidden className="shrink-0 text-[0.75rem] text-muted-foreground group-data-[selected=true]/item:text-current">
                            {KIND_LABELS[item.kind]}
                          </span>
                        ) : null}
                        <Kbd
                          aria-hidden
                          className={cn("hidden border-transparent bg-transparent shadow-none", "min-[37.5rem]:group-data-[selected=true]/item:inline-flex")}
                        >
                          Enter
                        </Kbd>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ))}
            </Command.List>

            <div
              aria-hidden
              className={cn(
                "hidden shrink-0 items-center gap-4 border-t border-border px-4 py-2.5 text-[0.75rem] text-muted-foreground",
                "min-[37.5rem]:flex"
              )}
            >
              <span className="flex items-center gap-1">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
                to move
              </span>
              <span className="flex items-center gap-1">
                <Kbd>Enter</Kbd>
                to open
              </span>
              <span className="ml-auto flex items-center gap-1">
                <Kbd>{modifier}</Kbd>
                <Kbd>K</Kbd>
                to search from anywhere
              </span>
            </div>
          </Command>
          <p role="status" className="sr-only">
            {announcement}
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
