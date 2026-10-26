"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { BottomNav } from "@/components/app-shell/bottom-nav";
import { focusMain, isInPage, prepareNavigation, showInPage } from "@/components/app-shell/destination";
import { GraderStatus } from "@/components/app-shell/grader-status";
import { NavDrawer } from "@/components/app-shell/nav-drawer";
import { STUDENT_NAV, TEACHER_NAV, type DrawerClass, type NavCountKey } from "@/components/app-shell/nav-items";
import { isPlainClick, NAV_COLLAPSED_COOKIE, NAV_COLLAPSED_MAX_AGE } from "@/components/app-shell/nav-model";
import { overlayHistory } from "@/components/app-shell/overlay-history";
import { useBackDismiss } from "@/components/app-shell/use-back-dismiss";
import { notifyLocationChange } from "@/components/app-shell/use-location-hash";
import { UserMenu, type SwitchableStudent } from "@/components/app-shell/user-menu";
import { Logo } from "@/components/brand/logo";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { SearchButton } from "@/components/command-palette/search-button";
import { usePaletteShortcut } from "@/components/command-palette/use-palette-shortcut";
import { prefetchSearchIndex } from "@/components/command-palette/use-search-index";
import { CustomizeDialog } from "@/components/customize/customize-dialog";
import { Menu } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EngineStatus } from "@/lib/ai/engines";
import type { Preferences } from "@/lib/preferences/schema";
import { cn } from "@/lib/utils";

/** Window classes (Material 3): compact < 600px, medium 600-839px, expanded 840px+. */
const MEDIUM_QUERY = "(min-width: 37.5rem)";
const EXPANDED_QUERY = "(min-width: 52.5rem)";
const LEGACY_COLLAPSE_KEY = "gs-drawer-collapsed";
const DRAWER_ID = "app-drawer";

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

function rememberCollapsed(collapsed: boolean) {
  document.cookie = `${NAV_COLLAPSED_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=${NAV_COLLAPSED_MAX_AGE}; samesite=lax`;
}

/**
 * App frame in the style of Google Classroom, adapting to the window (M3
 * window classes):
 *
 * - Phones (< 600px): a 64px top app bar (menu, logo, search icon, engine
 *   status, account) and a bottom navigation bar with the 3-5 everyday
 *   destinations. The menu button opens the full drawer as a sheet.
 * - 600-839px: a navigation rail on the left; the menu opens the sheet.
 * - 840px+: the drawer with the class list, which the menu button collapses
 *   to the rail (remembered in a cookie, so it renders collapsed on the
 *   server with no shift).
 *
 * The app bar holds the search field (Ctrl/Cmd+K), which opens the command
 * palette, and the account menu, which opens Customize. Pages own their
 * padding so the review queue can go full-bleed. <main id="main"> is the skip
 * link's target and a size container, so page grids switch on the room they
 * get (`@3xl:`) rather than the viewport.
 *
 * On phones and tablets Back closes the menu sheet or the full-screen search
 * instead of leaving the page under it (useBackDismiss), and an overlay never
 * outlives the page it was opened on.
 */
export function AppShell({
  user,
  nav,
  counts,
  classes,
  classesLabel,
  classHrefBase,
  homeHref,
  engines,
  students = [],
  demoLogin,
  preferences,
  initialCollapsed = false,
  showGoals = true,
  children,
}: {
  user: { id: string; name: string; email: string; role: "TEACHER" | "STUDENT" };
  /** Which destinations to show. (Icons are components, so the items live client-side.) */
  nav: "teacher" | "student";
  counts: Partial<Record<NavCountKey, number>>;
  /** In the user's saved class order. */
  classes: DrawerClass[];
  classesLabel: string;
  /** e.g. "/classes/" or "/student/classes/" */
  classHrefBase: string;
  homeHref: string;
  engines?: EngineStatus;
  students?: SwitchableStudent[];
  demoLogin: boolean;
  preferences: Preferences;
  /** The drawer was collapsed last time (cookie), so render it collapsed. */
  initialCollapsed?: boolean;
  /** Students: list Goals (the Home goal planner) unless the planner is hidden or unavailable. */
  showGoals?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const medium = useMediaQuery(MEDIUM_QUERY);
  const expanded = useMediaQuery(EXPANDED_QUERY);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  // Customize opens from the account menu or the palette, never from a DialogTrigger, so
  // Radix can't return focus on close: remember what had it.
  const customizeReturnFocus = useRef<HTMLElement | null>(null);
  // The sheet closed because a link in it was followed (focus goes to the page, not to ☰),
  // and the in-page move to make once it has gone (Home or Goals re-selected on Home).
  const sheetNavigated = useRef(false);
  const sheetAfterClose = useRef<(() => void) | null>(null);
  // The ☰ tooltip shows for hover and keyboard focus only, never for the focus it gets
  // back when the sheet closes after a tap (it would sit over the page title).
  const [menuTip, setMenuTip] = useState(false);

  const openCustomize = useCallback(() => {
    customizeReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setCustomizeOpen(true);
  }, []);

  function changeCustomizeOpen(next: boolean) {
    setCustomizeOpen(next);
    if (next) return;
    const saved = customizeReturnFocus.current;
    customizeReturnFocus.current = null;
    // After the sheet stops trapping focus (this frame), before its exit animation ends.
    // preventScroll: it was on screen when Customize opened, and focusing a control in the
    // sticky app bar would otherwise scroll the page to the top (html scroll-padding).
    window.requestAnimationFrame(() => {
      const target = saved?.isConnected && saved !== document.body ? saved : menuButtonRef.current;
      target?.focus({ preventScroll: true });
    });
  }

  // One-time move from the old localStorage flag to the cookie.
  useEffect(() => {
    try {
      if (document.cookie.includes(`${NAV_COLLAPSED_COOKIE}=`)) return;
      if (window.localStorage.getItem(LEGACY_COLLAPSE_KEY) === "1") {
        setCollapsed(true);
        rememberCollapsed(true);
      }
      window.localStorage.removeItem(LEGACY_COLLAPSE_KEY);
    } catch {
      // Storage unavailable: nothing to move.
    }
  }, []);

  // The sheet is for windows without the expanded drawer; close it if the window grows.
  useEffect(() => {
    if (expanded) setSheetOpen(false);
  }, [expanded]);

  // Overlays belong to the page they were opened on: close them when the route changes
  // (Back/Forward included). Links inside them already close them before navigating.
  useEffect(() => {
    setSheetOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Back closes the sheet, and the search where it is full screen (phones), instead of
  // navigating the page underneath.
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  useBackDismiss(sheetOpen, closeSheet);
  useBackDismiss(searchOpen, closeSearch, () => !window.matchMedia(MEDIUM_QUERY).matches);

  /** A link in the menu sheet: close the sheet, then go (see onNavLinkClick for the rest). */
  function navigateFromSheet(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    // A new tab or window: the browser's job, and the sheet stays.
    if (!isPlainClick(event)) return;
    if (isInPage(href)) {
      // This page (Home or Goals re-selected): move once the sheet and its scroll lock are gone.
      event.preventDefault();
      sheetAfterClose.current = () => void overlayHistory.settled().then(() => showInPage(href));
    } else {
      prepareNavigation(href);
      sheetNavigated.current = true;
      // The sheet's own history entry becomes the new page, so Back returns to this one.
      if (overlayHistory.takeOver()) {
        event.preventDefault();
        router.replace(href);
      }
      notifyLocationChange();
    }
    setSheetOpen(false);
  }

  usePaletteShortcut(searchOpen, setSearchOpen);
  const prefetch = useCallback(() => prefetchSearchIndex(user.id), [user.id]);

  function toggleMenu() {
    if (window.matchMedia(EXPANDED_QUERY).matches) {
      setCollapsed((value) => {
        rememberCollapsed(!value);
        return !value;
      });
    } else {
      setSheetOpen(true);
    }
  }

  const items = (nav === "teacher" ? TEACHER_NAV : STUDENT_NAV).filter((item) => showGoals || item.id !== "goals");
  const drawerProps = {
    items,
    counts,
    classes,
    classesLabel,
    classHrefBase,
    showGateNote: user.role === "TEACHER",
  };
  // Rail on medium windows, or a collapsed drawer on expanded ones (for tooltips only; CSS does the layout).
  const railShowing = medium && (!expanded || collapsed);
  // The review queue has its own sticky action bar on phones: it is a focused task, so the
  // bottom bar steps aside there (the menu button still reaches everything).
  const showBottomNav = !pathname.startsWith("/review");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-1 border-b border-border bg-card px-2 min-[37.5rem]:gap-2 min-[37.5rem]:px-3">
        <Tooltip
          open={menuTip}
          onOpenChange={(next) => {
            const button = menuButtonRef.current;
            setMenuTip(next && Boolean(button?.matches(":hover") || button?.matches(":focus-visible")));
          }}
        >
          <TooltipTrigger asChild>
            <Button
              ref={menuButtonRef}
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              // Contrast themes drop Button's focus ring: draw a system-colored outline instead.
              className="focus-visible:outline-hidden"
              aria-label="Main menu"
              aria-expanded={expanded ? !collapsed : sheetOpen}
              aria-controls={expanded ? DRAWER_ID : undefined}
              aria-haspopup={expanded ? undefined : "dialog"}
            >
              <Menu className="size-6" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{expanded ? (collapsed ? "Expand menu" : "Collapse menu") : "Main menu"}</TooltipContent>
        </Tooltip>
        <Logo href={homeHref} className="ml-0.5 focus-visible:outline-hidden min-[37.5rem]:mr-4" />
        <SearchButton
          ref={searchButtonRef}
          role={user.role}
          open={searchOpen}
          onOpen={() => setSearchOpen(true)}
          onPrefetch={prefetch}
          className="ml-auto min-[37.5rem]:ml-0 min-[37.5rem]:max-w-[40rem] min-[37.5rem]:min-w-[12rem]"
        />
        <div className="flex shrink-0 items-center gap-1 min-[37.5rem]:ml-auto min-[37.5rem]:gap-2">
          {engines ? <GraderStatus status={engines} /> : null}
          <UserMenu user={user} students={students} demoLogin={demoLogin} onCustomize={openCustomize} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          id={DRAWER_ID}
          className={cn(
            "@container/nav sticky top-16 hidden h-[calc(100dvh-4rem)] w-20 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar py-3 transition-[width] duration-200 ease-out motion-reduce:transition-none min-[37.5rem]:flex",
            !collapsed && "min-[52.5rem]:w-72"
          )}
        >
          <NavDrawer {...drawerProps} tooltips={railShowing} />
        </aside>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="left"
            className="w-[min(20rem,85vw)] gap-0 bg-sidebar p-0 sm:max-w-[20rem]"
            // No SheetTrigger for Radix to return focus to. After following a link, focus moves to
            // the page (as the skip link does); otherwise (Esc, scrim, Back) back to the menu button.
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const after = sheetAfterClose.current;
              sheetAfterClose.current = null;
              const navigated = sheetNavigated.current;
              sheetNavigated.current = false;
              if (after || navigated) {
                focusMain();
                after?.();
                return;
              }
              // preventScroll: the button sits in the sticky app bar; focusing it would scroll the page to the top.
              menuButtonRef.current?.focus({ preventScroll: true });
            }}
          >
            <SheetHeader className="h-16 shrink-0 justify-center border-b border-border px-4 py-0">
              <div>
                <Logo href={homeHref} className="focus-visible:outline-hidden" />
              </div>
              <SheetTitle className="sr-only">Main menu</SheetTitle>
              <SheetDescription className="sr-only">All pages and your classes</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 py-3">
              <NavDrawer {...drawerProps} onNavigate={navigateFromSheet} />
            </div>
          </SheetContent>
        </Sheet>

        <main
          id="main"
          className={cn(
            "@container min-w-0 flex-1 scroll-mt-16 outline-none",
            showBottomNav && "max-[37.5rem]:pb-[calc(5rem+env(safe-area-inset-bottom))]"
          )}
        >
          {children}
        </main>
      </div>

      {showBottomNav ? <BottomNav items={items.filter((item) => item.bottom)} counts={counts} /> : null}

      <CommandPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        role={user.role}
        userId={user.id}
        onCustomize={openCustomize}
        fallbackFocus={() => searchButtonRef.current}
        showGoals={showGoals}
      />
      <CustomizeDialog open={customizeOpen} onOpenChange={changeCustomizeOpen} preferences={preferences} role={user.role} />
    </div>
  );
}
