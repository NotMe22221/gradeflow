import Link from "next/link";

import { ClassAvatar } from "@/components/classroom/class-avatar";
import { classTheme } from "@/lib/ui/class-theme";

/**
 * The bar under the top app bar on every class page: a thin rule in the class
 * color (so you can tell which class you're in at a glance), the class name
 * (like Classroom's breadcrumb) and the section tabs. Sticky below the 4rem
 * top bar. `data-class-tab-bar` tells globals.css to add its height to the
 * page's scroll padding, so focused elements never hide under it.
 */
export function ClassTabBar({
  name,
  section,
  href,
  tabs,
}: {
  name: string;
  section: string | null;
  href: string;
  tabs: React.ReactNode;
}) {
  const theme = classTheme({ name });
  return (
    <div data-class-tab-bar className="sticky top-16 z-30 border-b border-border bg-card">
      <div aria-hidden className="h-1" style={{ backgroundColor: theme.accent }} />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-0 px-2 sm:px-4 md:flex-row md:items-center md:gap-4 lg:px-6">
        <Link
          href={href}
          className="flex min-w-0 items-center gap-2.5 rounded-full px-2 pt-2 outline-none focus-visible:ring-2 focus-visible:ring-ring md:max-w-[38%] md:pt-0"
        >
          <ClassAvatar name={name} className="size-7 text-xs" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-[0.9375rem] font-medium text-foreground">{name}</span>
            {section ? <span className="block truncate text-xs text-muted-foreground">{section}</span> : null}
          </span>
        </Link>
        <div className="min-w-0 md:ml-auto">{tabs}</div>
      </div>
    </div>
  );
}
