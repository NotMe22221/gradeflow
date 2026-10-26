import Link from "next/link";
import { Check } from "@/components/icons";

import { ClassAvatar } from "@/components/classroom/class-avatar";
import type { GradebookClassOption } from "@/lib/gradebook/types";
import { cn } from "@/lib/utils";

/**
 * Class filter chips for cross-class pages (Gradebook, Insights), built from
 * plain links (`<basePath>?class=<id>`): each chip carries the class's colored
 * avatar, and the selected one is tonal with a check mark. Works without
 * client JavaScript and every class view is linkable. The chips wrap rather
 * than scroll, so the selected class is always in view on a phone.
 */
export function ClassChips({
  classes,
  selectedId,
  basePath,
  className,
}: {
  classes: GradebookClassOption[];
  selectedId: string;
  /** The page the chips link to, e.g. "/gradebook" or "/insights". */
  basePath: string;
  className?: string;
}) {
  if (classes.length < 2) return null;

  return (
    <nav aria-label="Choose a class" className={className}>
      <ul className="flex flex-wrap items-center gap-2">
        {classes.map((klass) => {
          const active = klass.id === selectedId;
          return (
            <li key={klass.id} className="max-w-full">
              <Link
                href={`${basePath}?class=${encodeURIComponent(klass.id)}`}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 max-w-full items-center gap-2 rounded-full border pr-4 pl-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                  active
                    ? "border-transparent bg-primary-soft text-primary-soft-foreground"
                    : "border-border bg-card text-foreground hover:bg-foreground/[0.04]"
                )}
              >
                <ClassAvatar name={klass.name} className="size-7 text-xs" />
                <span className="min-w-0 truncate">{klass.name}</span>
                {klass.section ? (
                  <span className={cn("shrink-0 font-normal", active ? "opacity-80" : "text-muted-foreground")}>
                    {klass.section}
                  </span>
                ) : null}
                {active ? <Check className="-mr-1 size-4 shrink-0" aria-hidden /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
