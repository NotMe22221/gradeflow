"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type PageTab = {
  href: string;
  label: string;
  /** Extra paths that also mark this tab active. */
  match?: (pathname: string) => boolean;
  count?: number;
};

/**
 * Link tabs with Classroom's underline indicator (Stream / Classwork /
 * People / Grades). Horizontally scrollable on phones, so the keyboard focus
 * ring is inset (an outer ring would be clipped by the scroller).
 */
export function PageTabs({ tabs, className, label }: { tabs: PageTab[]; className?: string; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className={cn("-mb-px flex gap-1 overflow-x-auto", className)}>
      {tabs.map((tab) => {
        const active = tab.match ? tab.match(pathname) : pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex h-12 shrink-0 items-center gap-2 rounded-t-md px-4 text-sm font-medium whitespace-nowrap transition-colors outline-none hover:bg-foreground/[0.04] focus-visible:bg-primary/[0.08] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {tab.count ? (
              <span className="tabular rounded-full bg-primary-soft px-1.5 py-0.5 text-[11px] font-semibold text-primary-soft-foreground">
                {tab.count}
              </span>
            ) : null}
            {active ? <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-primary" aria-hidden /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
