import Link from "next/link";

import { ClassAvatar } from "@/components/classroom/class-avatar";

/**
 * The bar under the top app bar on every class page: the class name (like
 * Classroom's breadcrumb) and the section tabs. Sticky below the 64px top bar.
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
  return (
    <div className="sticky top-16 z-30 border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-0 px-2 sm:px-4 md:flex-row md:items-center md:gap-4 lg:px-6">
        <Link
          href={href}
          className="flex min-w-0 items-center gap-2.5 rounded-full px-2 pt-2.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring md:max-w-[38%] md:pt-0"
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
