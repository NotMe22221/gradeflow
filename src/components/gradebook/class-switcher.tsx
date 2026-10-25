import Link from "next/link";

import type { GradebookClassOption } from "@/lib/gradebook/types";
import { cn } from "@/lib/utils";

/**
 * Segmented class picker built from plain links (`?class=<id>`), so it works
 * without client JavaScript and every class view is linkable. Scrolls
 * horizontally on narrow screens instead of wrapping.
 */
export function ClassSwitcher({
  classes,
  selectedId,
  className,
}: {
  classes: GradebookClassOption[];
  selectedId: string;
  className?: string;
}) {
  if (classes.length < 2) return null;

  return (
    <nav aria-label="Choose a class" className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <div className="inline-flex h-10 items-center gap-1 rounded-lg bg-muted p-1">
        {classes.map((klass) => {
          const active = klass.id === selectedId;
          return (
            <Link
              key={klass.id}
              href={`/gradebook?class=${encodeURIComponent(klass.id)}`}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-full items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                active
                  ? "bg-card text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {klass.name}
              {klass.section ? (
                <span className="font-normal text-muted-foreground">· {klass.section}</span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
