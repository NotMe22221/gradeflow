import Link from "next/link";
import { ChevronRight } from "@/components/icons";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Section title with an optional "View all"-style text link, shared by Home sections. */
export function SectionHeader({
  id,
  title,
  description,
  href,
  linkLabel,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex min-h-10 items-center justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-lg leading-tight font-medium text-foreground">
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {href && linkLabel ? (
        <Button asChild variant="text" size="sm" className="-mr-2 h-10 shrink-0">
          <Link href={href}>
            {linkLabel}
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
