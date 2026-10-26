"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";

import { COUNT_LABELS, type DrawerClass, type NavCountKey, type NavItem } from "@/components/app-shell/nav-items";
import { activeClassId, activeNavId, badgeText } from "@/components/app-shell/nav-model";
import { notifyLocationChange, useLocationHash } from "@/components/app-shell/use-location-hash";
import { ClassAvatar } from "@/components/classroom/class-avatar";
import { ShieldCheck } from "@/components/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * A tooltip in rail mode only, where class names are just colored initials.
 * The Tooltip wrapper is always there (so toggling the rail never remounts
 * the link); only its content comes and goes. Radix tooltips open on
 * keyboard focus as well as hover.
 */
function RailTip({ label, show, children }: { label: string; show: boolean; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      {show ? <TooltipContent side="right">{label}</TooltipContent> : null}
    </Tooltip>
  );
}

/**
 * The navigation drawer, in Google Classroom's shape: destinations as pill
 * items, then the class list ("Teaching" / "Enrolled") with colored class
 * avatars, and for teachers a reminder of the approval gate.
 *
 * In the app's side panel it is also the navigation rail. The panel is a size
 * container named "nav", and every rail style is an `@max-[11rem]/nav:`
 * variant, so the layout follows the panel's real width with no JavaScript:
 * 80px (600-839px windows, or a collapsed drawer) gives the M3 rail (icon in
 * a pill over a short label, class avatars only); 18rem gives the drawer.
 * Server-rendered either way, so there is no shift on load. In the phone
 * sheet there is no "nav" container, so it is always the full drawer.
 *
 * The current destination has a filled icon, the secondary-container pill,
 * a semibold label and aria-current="page".
 */
export function NavDrawer({
  items,
  counts,
  classes,
  classesLabel,
  classHrefBase,
  tooltips = false,
  showGateNote = false,
  onNavigate,
}: {
  items: NavItem[];
  counts: Partial<Record<NavCountKey, number>>;
  classes: DrawerClass[];
  classesLabel: string;
  /** e.g. "/classes/" or "/student/classes/" */
  classHrefBase: string;
  /** Rail mode is showing: give abbreviated items tooltips. */
  tooltips?: boolean;
  showGateNote?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const hash = useLocationHash();
  const classesHeadingId = useId();
  const currentClass = activeClassId(
    classes.map((klass) => klass.id),
    classHrefBase,
    pathname
  );
  // With a class open, its own item marks the page, not "Classes" as well.
  const current = currentClass ? null : activeNavId(items, pathname, hash);

  function navigate() {
    notifyLocationChange();
    onNavigate?.();
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-3 @max-[11rem]/nav:px-1">
      <nav aria-label="Main" className="flex shrink-0 flex-col gap-0.5 @max-[11rem]/nav:gap-1">
        {items.map((item) => {
          const active = item.id === current;
          const count = item.countKey ? (counts[item.countKey] ?? 0) : 0;
          const Icon = item.icon;
          return (
            <RailTip key={item.id} label={item.label} show={tooltips && Boolean(item.shortLabel)}>
              <Link
                href={item.href}
                onClick={navigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group/navitem relative flex h-12 shrink-0 items-center gap-3 rounded-full px-4 text-[0.875rem] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  "@max-[11rem]/nav:h-auto @max-[11rem]/nav:min-h-14 @max-[11rem]/nav:flex-col @max-[11rem]/nav:justify-center @max-[11rem]/nav:gap-1 @max-[11rem]/nav:rounded-2xl @max-[11rem]/nav:px-0 @max-[11rem]/nav:py-1",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground forced-colors:outline @max-[11rem]/nav:bg-transparent @max-[11rem]/nav:text-foreground"
                    : "font-medium text-sidebar-foreground hover:bg-foreground/[0.06] @max-[11rem]/nav:hover:bg-transparent"
                )}
              >
                <span
                  className={cn(
                    "relative flex shrink-0 items-center justify-center rounded-full transition-colors",
                    "@max-[11rem]/nav:h-8 @max-[11rem]/nav:w-14",
                    active
                      ? "@max-[11rem]/nav:bg-sidebar-accent @max-[11rem]/nav:text-sidebar-accent-foreground"
                      : "@max-[11rem]/nav:group-hover/navitem:bg-foreground/[0.06]"
                  )}
                >
                  <Icon filled={active} className="size-5 @max-[11rem]/nav:size-6" aria-hidden />
                  {count > 0 ? (
                    <span
                      aria-hidden
                      className="tabular absolute -top-1 right-1 hidden h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-semibold text-primary-foreground @max-[11rem]/nav:flex"
                    >
                      {badgeText(count)}
                    </span>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 truncate @max-[11rem]/nav:hidden">{item.label}</span>
                <span className="hidden max-w-full truncate px-0.5 text-[0.75rem] leading-4 @max-[11rem]/nav:block">
                  {item.shortLabel ?? item.label}
                </span>
                {count > 0 ? (
                  <span aria-hidden className="tabular text-[0.75rem] font-semibold @max-[11rem]/nav:hidden">
                    {badgeText(count)}
                  </span>
                ) : null}
                {count > 0 && item.countKey ? <span className="sr-only">, {COUNT_LABELS[item.countKey](count)}</span> : null}
              </Link>
            </RailTip>
          );
        })}
      </nav>

      {classes.length > 0 ? (
        <>
          <div className="mx-4 my-3 h-px shrink-0 bg-sidebar-border @max-[11rem]/nav:mx-3" />
          {/* -m-1 p-1: room inside the scroller for the items' focus rings. */}
          <nav
            aria-labelledby={classesHeadingId}
            className="-m-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1 @max-[11rem]/nav:gap-1"
          >
            <p
              id={classesHeadingId}
              className="shrink-0 px-4 pt-0.5 pb-1.5 text-[0.8125rem] font-medium text-muted-foreground @max-[11rem]/nav:sr-only"
            >
              {classesLabel}
            </p>
            {classes.map((klass) => {
              const active = klass.id === currentClass;
              return (
                <RailTip key={klass.id} label={klass.name} show={tooltips}>
                  <Link
                    href={`${classHrefBase}${klass.id}`}
                    onClick={navigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group/navitem flex h-14 shrink-0 items-center gap-3 rounded-full pr-4 pl-3 text-[0.875rem] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      "@max-[11rem]/nav:h-12 @max-[11rem]/nav:justify-center @max-[11rem]/nav:rounded-2xl @max-[11rem]/nav:px-0",
                      active
                        ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground forced-colors:outline @max-[11rem]/nav:bg-transparent"
                        : "font-medium text-sidebar-foreground hover:bg-foreground/[0.06] @max-[11rem]/nav:hover:bg-transparent"
                    )}
                  >
                    <span
                      className={cn(
                        "flex shrink-0 items-center justify-center rounded-full transition-colors",
                        "@max-[11rem]/nav:h-10 @max-[11rem]/nav:w-14",
                        active ? "@max-[11rem]/nav:bg-sidebar-accent" : "@max-[11rem]/nav:group-hover/navitem:bg-foreground/[0.06]"
                      )}
                    >
                      <ClassAvatar name={klass.name} />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight @max-[11rem]/nav:sr-only">
                      <span className="block truncate">{klass.name}</span>
                      {klass.section ? (
                        <span
                          className={cn(
                            "block truncate text-[0.75rem] font-normal",
                            active ? "text-sidebar-accent-foreground/80" : "text-muted-foreground"
                          )}
                        >
                          {klass.section}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </RailTip>
              );
            })}
          </nav>
        </>
      ) : (
        <div className="flex-1" />
      )}

      {showGateNote ? (
        <div className="mt-3 shrink-0 rounded-2xl bg-secondary px-4 py-3 text-[0.75rem] leading-relaxed text-muted-foreground @max-[11rem]/nav:hidden">
          <p className="mb-0.5 flex items-center gap-1.5 font-medium text-foreground">
            <ShieldCheck className="size-4 text-success" aria-hidden />
            Teacher approval gate
          </p>
          <p>Suggested scores stay drafts. Nothing reaches students until you approve it.</p>
        </div>
      ) : null}
    </div>
  );
}
