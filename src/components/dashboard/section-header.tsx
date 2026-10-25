import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Section title with an optional "see all" link, shared by dashboard sections. */
export function SectionHeader({
  id,
  title,
  href,
  linkLabel,
}: {
  id: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex h-8 items-center justify-between gap-4">
      <h2 id={id} className="text-base font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {href && linkLabel ? (
        <Button asChild variant="ghost" size="sm" className="-mr-2.5">
          <Link href={href}>
            {linkLabel}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
