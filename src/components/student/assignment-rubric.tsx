import { ListChecks } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatPoints, pluralize } from "@/lib/format";

export type StudentRubricCriterion = {
  id: string;
  title: string;
  description: string;
  maxPoints: number;
};

/** The rubric as the student sees it: criteria, points, and what full credit looks like. */
export function AssignmentRubric({
  criteria,
  className,
}: {
  criteria: StudentRubricCriterion[];
  className?: string;
}) {
  const total = criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);

  return (
    <section aria-labelledby="rubric-heading" className={className}>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <h2
            id="rubric-heading"
            className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
          >
            <ListChecks className="size-4 text-muted-foreground" aria-hidden />
            Rubric
          </h2>
          {criteria.length > 0 ? (
            <span className="tabular text-sm text-muted-foreground">{pluralize(total, "point")}</span>
          ) : null}
        </div>
        {criteria.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            Your teacher hasn&apos;t added rubric criteria yet.
          </p>
        ) : (
          <ol className="divide-y divide-border">
            {criteria.map((criterion, index) => (
              <li key={criterion.id} className="flex gap-3 px-5 py-4">
                <span
                  className="tabular mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground ring-1 ring-border"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm leading-5 font-medium text-foreground">{criterion.title}</h3>
                    <span className="tabular shrink-0 text-sm leading-5 font-medium text-muted-foreground">
                      {formatPoints(criterion.maxPoints)} pts
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed whitespace-pre-line text-muted-foreground">
                    <span className="font-medium text-foreground/80">What full credit looks like: </span>
                    {criterion.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </section>
  );
}
