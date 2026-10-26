"use client";

import { useEffect, useRef, useState } from "react";
import { GraduationCap, Menu, School } from "@/components/icons";

import { GraderStatus } from "@/components/app-shell/grader-status";
import { NavDrawer } from "@/components/app-shell/nav-drawer";
import { STUDENT_NAV, TEACHER_NAV, type DrawerClass } from "@/components/app-shell/nav-items";
import { UserMenu, type SwitchableStudent } from "@/components/app-shell/user-menu";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { EngineStatus } from "@/lib/ai/engines";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "gs-drawer-collapsed";
const DESKTOP_QUERY = "(min-width: 1024px)";
const DRAWER_ID = "app-drawer";

/**
 * App frame in the style of Google Classroom: a 64px top app bar (menu
 * button, logo, engine status, account) over a left navigation drawer with
 * the class list. On desktop the menu button collapses the drawer to an icon
 * rail; on phones it opens the drawer as a sheet. Pages own their padding so
 * the review queue can go full-bleed. <main id="main"> is the root layout's
 * skip-link target, and a size container, so page grids can switch columns
 * on the room they actually get (`@3xl:` etc.) rather than on the viewport,
 * which the drawer shares.
 */
export function AppShell({
  user,
  nav,
  counts,
  classes,
  classesLabel,
  classesHref,
  classHrefBase,
  homeHref,
  engines,
  students = [],
  demoLogin,
  children,
}: {
  user: { name: string; email: string; role: "TEACHER" | "STUDENT" };
  /** Which drawer to show. (Icons are components, so the items live client-side.) */
  nav: "teacher" | "student";
  counts: Partial<Record<"review" | "todo", number>>;
  classes: DrawerClass[];
  classesLabel: string;
  classesHref: string;
  /** e.g. "/classes/" or "/student/classes/" */
  classHrefBase: string;
  homeHref: string;
  engines?: EngineStatus;
  students?: SwitchableStudent[];
  demoLogin: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Which drawer the menu button drives: the desktop drawer or the phone sheet.
  const [isDesktop, setIsDesktop] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // Storage can be unavailable (private mode); the drawer just starts open.
    }
  }, []);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  function toggleMenu() {
    if (window.matchMedia(DESKTOP_QUERY).matches) {
      setCollapsed((value) => {
        const next = !value;
        try {
          window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
        } catch {
          // Not persisted; that's fine.
        }
        return next;
      });
    } else {
      setMobileOpen(true);
    }
  }

  const drawerProps = {
    items: nav === "teacher" ? TEACHER_NAV : STUDENT_NAV,
    counts,
    classes,
    classesLabel,
    classesHref,
    classesIcon: nav === "teacher" ? School : GraduationCap,
    classHref: (id: string) => `${classHrefBase}${id}`,
    showGateNote: user.role === "TEACHER",
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-1 border-b border-border bg-card px-2 sm:gap-2 sm:px-3">
        <Button
          ref={menuButtonRef}
          variant="ghost"
          size="icon"
          onClick={toggleMenu}
          aria-label="Main menu"
          aria-expanded={isDesktop ? !collapsed : mobileOpen}
          aria-controls={isDesktop ? DRAWER_ID : undefined}
          aria-haspopup={isDesktop ? undefined : "dialog"}
        >
          <Menu className="size-5" />
        </Button>
        <Logo href={homeHref} className="ml-1" />
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {engines ? <GraderStatus status={engines} /> : null}
          <UserMenu user={user} students={students} demoLogin={demoLogin} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          id={DRAWER_ID}
          className={cn(
            "sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-3 transition-[width] duration-200 motion-reduce:transition-none lg:flex",
            collapsed ? "w-[88px] px-5" : "w-72 px-3"
          )}
        >
          <NavDrawer {...drawerProps} collapsed={collapsed} />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="w-[300px] max-w-[85vw] gap-0 p-0"
            // No SheetTrigger for Radix to return focus to: go back to the menu button.
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              menuButtonRef.current?.focus();
            }}
          >
            <SheetHeader className="h-16 justify-center border-b border-border px-4 py-0">
              <div>
                <Logo href={homeHref} />
              </div>
              <SheetTitle className="sr-only">Main menu</SheetTitle>
              <SheetDescription className="sr-only">Main navigation</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <NavDrawer {...drawerProps} onNavigate={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <main id="main" className="@container min-w-0 flex-1 scroll-mt-16 outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
