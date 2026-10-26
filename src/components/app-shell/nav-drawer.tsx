"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import type { DrawerClass, NavItem } from "@/components/app-shell/nav-items";
import { ClassAvatar } from "@/components/classroom/class-avatar";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string, matches: string[] = []): boolean {
  if (pathname === href) return true;
  // "Home" for students is /student; don't light it up for every /student/* page.
  if (href !== "/student" && pathname.startsWith(`${href}/`)) return true;
  return matches.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Google Classroom-style navigation drawer: pill-shaped items, then the
 * class list ("Teaching" or "Enrolled") with colored class avatars. In
 * `collapsed` mode it is an icon rail.
 */
export function NavDrawer({
  items,
  counts,
  classes,
  classesLabel,
  classesHref,
  classHref,
  collapsed = false,
  showGateNote = false,
  onNavigate,
}: {
  items: NavItem[];
  counts: Partial<Record<"review" | "todo", number>>;
  classes: DrawerClass[];
  classesLabel: string;
  classesHref: string;
  classHref: (id: string) => string;
  collapsed?: boolean;
  showGateNote?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const itemClass = (active: boolean) =>
    cn(
      "group flex h-12 items-center gap-4 rounded-full text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
      collapsed ? "w-12 justify-center" : "pr-4 pl-4",
      active
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-sidebar-foreground hover:bg-foreground/[0.06]"
    );

  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item.href, item.matches);
          const count = item.countKey ? counts[item.countKey] ?? 0 : 0;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={itemClass(active)}
            >
              <span className="relative">
                <Icon className="size-5 shrink-0" aria-hidden />
                {collapsed && count > 0 ? (
                  <span className="absolute -top-1.5 -right-2 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 font-semibold text-primary-foreground tabular">
                    {count}
                  </span>
                ) : null}
              </span>
              {collapsed ? <span className="sr-only">{item.label}</span> : <span className="flex-1 truncate">{item.label}</span>}
              {!collapsed && count > 0 ? (
                <span className="tabular text-xs font-semibold" aria-label={`${count} waiting`}>
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="my-3 h-px bg-sidebar-border" />

      <nav aria-label={classesLabel} className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        <Link
          href={classesHref}
          onClick={onNavigate}
          title={collapsed ? classesLabel : undefined}
          className={cn(
            "flex h-10 items-center rounded-full text-sm font-medium text-muted-foreground outline-none hover:bg-foreground/[0.06] focus-visible:ring-[3px] focus-visible:ring-ring",
            collapsed ? "w-12 justify-center" : "px-4",
            pathname === classesHref && "text-sidebar-accent-foreground"
          )}
        >
          {collapsed ? <span className="text-[11px]">{classesLabel.slice(0, 5)}</span> : classesLabel}
        </Link>
        {classes.map((klass) => {
          const href = classHref(klass.id);
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={klass.id}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? klass.name : undefined}
              className={cn(itemClass(active), "h-14")}
            >
              <ClassAvatar name={klass.name} />
              {collapsed ? (
                <span className="sr-only">{klass.name}</span>
              ) : (
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate">{klass.name}</span>
                  {klass.section ? (
                    <span className="block truncate text-xs font-normal text-muted-foreground">{klass.section}</span>
                  ) : null}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {showGateNote && !collapsed ? (
        <div className="mt-3 rounded-2xl bg-secondary p-3.5 text-xs leading-relaxed text-muted-foreground">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
            <ShieldCheck className="size-3.5 text-success" aria-hidden />
            Teacher approval gate
          </div>
          AI drafts the first pass. Nothing reaches the gradebook until you approve it.
        </div>
      ) : null}
    </div>
  );
}
