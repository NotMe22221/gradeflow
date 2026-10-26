"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { COUNT_LABELS, type NavCountKey, type NavItem } from "@/components/app-shell/nav-items";
import { activeNavId, badgeText } from "@/components/app-shell/nav-model";
import { notifyLocationChange, useLocationHash } from "@/components/app-shell/use-location-hash";
import { cn } from "@/lib/utils";

/**
 * Phone navigation bar (windows under 600px), Material 3 style: three to
 * five labelled destinations, the current one with a filled icon in a pill
 * and a semibold label. Fixed to the bottom above the home indicator
 * (safe-area padding); the shell pads <main> by the bar's height so nothing
 * hides under it, and globals.css adds scroll padding for it via
 * data-bottom-nav. Counts show as a small badge on the icon.
 */
export function BottomNav({
  items,
  counts,
}: {
  items: NavItem[];
  counts: Partial<Record<NavCountKey, number>>;
}) {
  const pathname = usePathname();
  const hash = useLocationHash();
  const current = activeNavId(items, pathname, hash);

  return (
    <nav
      aria-label="Main"
      data-bottom-nav=""
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] min-[37.5rem]:hidden"
    >
      <ul className="mx-auto flex h-20 max-w-xl items-stretch px-1">
        {items.map((item) => {
          const active = item.id === current;
          const count = item.countKey ? (counts[item.countKey] ?? 0) : 0;
          const Icon = item.icon;
          return (
            <li key={item.id} className="flex min-w-0 flex-1">
              <Link
                href={item.href}
                onClick={notifyLocationChange}
                aria-current={active ? "page" : undefined}
                className="group/tab flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl pt-1.5 pb-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <span
                  className={cn(
                    "relative flex h-8 w-16 items-center justify-center rounded-full transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground forced-colors:outline"
                      : "text-muted-foreground group-hover/tab:bg-foreground/[0.06] group-active/tab:bg-foreground/[0.1]"
                  )}
                >
                  <Icon filled={active} className="size-6" aria-hidden />
                  {count > 0 ? (
                    <span
                      aria-hidden
                      className="tabular absolute -top-0.5 left-[calc(50%+0.375rem)] flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-semibold text-primary-foreground ring-2 ring-card"
                    >
                      {badgeText(count)}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "max-w-full truncate px-1 text-[0.75rem] leading-4",
                    active ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
                {count > 0 && item.countKey ? <span className="sr-only">, {COUNT_LABELS[item.countKey](count)}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
