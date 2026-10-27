"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { onNavLinkClick } from "@/components/app-shell/destination";
import { COUNT_LABELS, type NavCountKey, type NavItem } from "@/components/app-shell/nav-items";
import { activeNavId, badgeText } from "@/components/app-shell/nav-model";
import { useLocationHash } from "@/components/app-shell/use-location-hash";
import { cn } from "@/lib/utils";

/**
 * Phone navigation bar (windows under 600px): three to five labelled
 * destinations on a floating Liquid Glass capsule, the current one with a
 * filled icon in an accent glass pill and a bold label. It floats 0.5rem
 * above the bottom edge and the home indicator (safe-area padding), 4.75rem
 * in all; the shell pads <main> by 5rem so nothing hides under it, and
 * globals.css adds scroll padding for it via data-bottom-nav. Taps between
 * the capsule and the screen edge reach the page. Counts show as a small
 * badge on the icon. Tapping the destination that is open scrolls back to its
 * top (or to the goal planner, for Goals), M3 style.
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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] min-[37.5rem]:hidden"
    >
      <ul className="glass pointer-events-auto mx-auto flex h-[4.25rem] max-w-xl items-stretch rounded-[2.125rem] px-1">
        {items.map((item) => {
          const active = item.id === current;
          const count = item.countKey ? (counts[item.countKey] ?? 0) : 0;
          const Icon = item.icon;
          return (
            <li key={item.id} className="flex min-w-0 flex-1">
              <Link
                href={item.href}
                onClick={(event) => onNavLinkClick(event, item.href)}
                aria-current={active ? "page" : undefined}
                className="group/tab flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[1.75rem] pt-1 pb-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-hidden forced-colors:focus-visible:-outline-offset-2"
              >
                <span
                  className={cn(
                    "relative flex h-8 w-16 items-center justify-center rounded-full transition-colors",
                    active
                      ? "liquid text-primary-foreground forced-colors:outline"
                      : "text-foreground group-hover/tab:bg-foreground/[0.06] group-active/tab:bg-foreground/[0.1]"
                  )}
                >
                  <Icon filled={active} className="size-6" aria-hidden />
                  {count > 0 ? (
                    <span
                      aria-hidden
                      className="tabular absolute -top-0.5 left-[calc(50%+0.375rem)] z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-semibold text-primary-foreground ring-2 ring-card"
                    >
                      {badgeText(count)}
                    </span>
                  ) : null}
                </span>
                {/* No side padding: four slots are ~78px at 320px, and "Gradebook" at the largest
                    text size needs 73px of them. Truncation stays as the last resort. */}
                <span
                  className={cn(
                    "max-w-full truncate text-[0.75rem] leading-4",
                    active ? "font-bold text-foreground" : "font-medium text-foreground"
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
