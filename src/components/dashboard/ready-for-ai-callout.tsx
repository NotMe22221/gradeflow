import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { pluralize } from "@/lib/format";
import type { ReadyForAiAssignment } from "@/lib/stats";
import { cn } from "@/lib/utils";

/**
 * A quiet nudge when papers are waiting on an AI first pass. Links straight
 * to the assignment when they all belong to one, otherwise to Classes.
 */
export function ReadyForAiCallout({
  count,
  assignments,
  className,
}: {
  count: number;
  assignments: ReadyForAiAssignment[];
  className?: string;
}) {
  if (count <= 0) return null;

  const single = assignments.length === 1 ? assignments[0] : null;
  const headline = `${pluralize(count, "paper")} ${count === 1 ? "is" : "are"} ready for an AI first pass`;

  let where: string;
  if (single) {
    where = `${single.title} · ${single.className}.`;
  } else if (assignments.length > 1) {
    const listed = assignments.slice(0, 3).map((a) => `${a.title} (${a.count})`);
    const more = assignments.length - listed.length;
    where = `${listed.join(", ")}${more > 0 ? ` and ${more} more` : ""}.`;
  } else {
    where = "";
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:px-6",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground ring-1 ring-border">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{headline}</p>
          <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
            {where ? `${where} ` : ""}Drafts go to your review queue, never straight to the gradebook.
          </p>
        </div>
      </div>
      <Button asChild variant="outline" size="sm" className="self-start sm:self-center">
        {single ? (
          <Link href={`/assignments/${encodeURIComponent(single.id)}`}>
            Open assignment
            <ArrowRight aria-hidden />
          </Link>
        ) : (
          <Link href="/classes">
            Go to classes
            <ArrowRight aria-hidden />
          </Link>
        )}
      </Button>
    </div>
  );
}
