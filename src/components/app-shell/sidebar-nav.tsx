"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TEACHER_NAV } from "@/components/app-shell/nav-items";
import { cn } from "@/lib/utils";

export function SidebarNav({
  counts,
  onNavigate,
}: {
  counts: { review: number };
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {TEACHER_NAV.map((item) => {
        const active =
          pathname === item.href ||
          pathname.startsWith(`${item.href}/`) ||
          (item.href === "/classes" && pathname.startsWith("/assignments/"));
        const count = item.countKey ? counts[item.countKey] : 0;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
              aria-hidden
            />
            <span className="flex-1 truncate">{item.label}</span>
            {count > 0 ? (
              <span
                className={cn(
                  "tabular min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold",
                  active ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary-soft-foreground"
                )}
                aria-label={`${count} waiting`}
              >
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
