import { ShieldCheck } from "lucide-react";

import { GraderStatus } from "@/components/app-shell/grader-status";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { UserMenu, type SwitchableStudent } from "@/components/app-shell/user-menu";
import { Logo } from "@/components/brand/logo";
import type { GraderInfo } from "@/lib/grading/config";

/**
 * Teacher app frame: top bar (logo, grader status, demo user) above a left
 * sidebar and the main content area. Pages own their own padding so the
 * review queue can go full-bleed.
 */
export function AppShell({
  user,
  graderInfo,
  counts,
  students,
  demoLogin,
  children,
}: {
  user: { name: string; email: string; role: "TEACHER" | "STUDENT" };
  graderInfo: GraderInfo;
  counts: { review: number };
  students: SwitchableStudent[];
  demoLogin: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/75 sm:px-4">
        <MobileNav counts={counts} />
        <Logo href="/dashboard" />
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <GraderStatus info={graderInfo} />
          <UserMenu user={user} students={students} demoLogin={demoLogin} />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex">
          <SidebarNav counts={counts} />
          <div className="rounded-lg border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground shadow-card">
            <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="size-3.5 text-success" aria-hidden />
              Teacher approval gate
            </div>
            AI drafts the first pass. Nothing reaches the gradebook until you approve it.
          </div>
        </aside>
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
