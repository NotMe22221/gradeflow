"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";

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

/**
 * App frame in the style of Google Classroom: a 64px top app bar (menu
 * button, logo, engine status, account) over a left navigation drawer with
 * the class list. On desktop the menu button collapses the drawer to an icon
 * rail; on phones it opens the drawer as a sheet. Pages own their padding so
 * the review queue can go full-bleed.
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

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // Storage can be unavailable (private mode); the drawer just starts open.
    }
  }, []);

  function toggleMenu() {
    if (window.matchMedia("(min-width: 1024px)").matches) {
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
    classHref: (id: string) => `${classHrefBase}${id}`,
    showGateNote: user.role === "TEACHER",
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-1 border-b border-border bg-card px-2 sm:gap-2 sm:px-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMenu}
          aria-label={collapsed ? "Expand main menu" : "Main menu"}
          aria-expanded={mobileOpen || undefined}
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
          className={cn(
            "sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-3 transition-[width] duration-200 lg:flex",
            collapsed ? "w-[88px] px-5" : "w-72 px-3"
          )}
        >
          <NavDrawer {...drawerProps} collapsed={collapsed} />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[300px] max-w-[85vw] gap-0 p-0">
            <SheetHeader className="h-16 justify-center border-b border-border px-4 py-0">
              <SheetTitle asChild>
                <div>
                  <Logo href={homeHref} />
                </div>
              </SheetTitle>
              <SheetDescription className="sr-only">Main navigation</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <NavDrawer {...drawerProps} onNavigate={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
