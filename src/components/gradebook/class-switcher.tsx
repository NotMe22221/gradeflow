import Link from "next/link";
import { Check } from "lucide-react";

import type { GradebookClassOption } from "@/lib/gradebook/types";
import { cn } from "@/lib/utils";

/**
 * Class filter chips built from plain links (`?class=<id>`), in the style of
 * Material filter chips: the selected class is tonal with a check mark. Works
 * without client JavaScript and every class view is linkable. Scrolls
 * horizontally on narrow screens instead of wrapping.
 */
export function ClassSwitcher({
  classes,
  selectedId,
  basePath = "/gradebook",
  className,
}: {
  classes: GradebookClassOption[];
  selectedId: string;
  /** The page the links point at; the class goes in `?class=<id>`. Gradebook by default. */
  basePath?: string;
  className?: string;
}) {
  if (classes.length < 2) return null;

  return (
    <nav aria-label="Choose a class" className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <ul className="flex w-max items-center gap-2">
        {classes.map((klass) => {
          const active = klass.id === selectedId;
          return (
            <li key={klass.id}>
              <Link
                href={`${basePath}?class=${encodeURIComponent(klass.id)}`}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                  active
                    ? "border-transparent bg-primary-soft pl-3 text-primary-soft-foreground"
                    : "border-input/50 bg-card text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                )}
              >
                {active ? <Check className="size-4" aria-hidden /> : null}
                {klass.name}
                {klass.section ? <span className="font-normal opacity-80">· {klass.section}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
