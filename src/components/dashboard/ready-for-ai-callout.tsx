import { Fragment } from "react";
import Link from "next/link";
import { ListChecks } from "@/components/icons";

import { Button } from "@/components/ui/button";
import { pluralize } from "@/lib/format";
import type { ReadyForAiAssignment } from "@/lib/stats";
import { cn } from "@/lib/utils";

const LISTED = 3;

/**
 * A slim notice when papers are waiting on an AI first pass. Each assignment
 * links to its page, where "Run AI first pass" lives; a single assignment
 * also gets a button.
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
  const listed = assignments.slice(0, LISTED);
  const more = assignments.length - listed.length;
  const headline = `${pluralize(count, "paper")} ${count === 1 ? "is" : "are"} ready for an AI first pass.`;

  return (
    <aside
      aria-label="Ready for an AI first pass"
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-primary-soft bg-primary-soft/35 px-4 py-3 sm:flex-row sm:items-center sm:gap-4",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ListChecks className="size-4" aria-hidden />
        </span>
        <p className="min-w-0 pt-1.5 text-sm leading-5 text-pretty text-foreground">
          <span className="font-medium">{headline}</span>{" "}
          {single ? (
            <span className="text-muted-foreground">
              {single.title} · {single.className}.{" "}
            </span>
          ) : listed.length > 0 ? (
            <span className="text-muted-foreground">
              {listed.map((assignment, index) => (
                <Fragment key={assignment.id}>
                  {index > 0 ? ", " : null}
                  <Link
                    href={`/assignments/${encodeURIComponent(assignment.id)}`}
                    className="rounded-sm text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                  >
                    {assignment.title}
                  </Link>{" "}
                  <span className="tabular">({assignment.count})</span>
                </Fragment>
              ))}
              {more > 0 ? ` and ${more} more` : null}.{" "}
            </span>
          ) : null}
          <span className="text-muted-foreground">Drafts wait in To review for your approval.</span>
        </p>
      </div>
      {single ? (
        <Button asChild variant="text" className="-my-1 self-end sm:self-center">
          <Link href={`/assignments/${encodeURIComponent(single.id)}`}>Open assignment</Link>
        </Button>
      ) : null}
    </aside>
  );
}
