import Link from "next/link";

import { ChevronRight } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SectionAction = { href: string; label: string };

/** A Home section's title row: the title, an optional line under it, and an optional "View all"-style link. */
export function SectionHeading({
  id,
  title,
  description,
  action,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  action?: SectionAction;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex min-h-10 items-center justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-[1.125rem] leading-6 font-medium text-balance text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 max-w-[65ch] text-[0.875rem] leading-5 text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <Button asChild variant="text" size="sm" className="-mr-2 h-10 shrink-0">
          <Link href={action.href}>
            {action.label}
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
