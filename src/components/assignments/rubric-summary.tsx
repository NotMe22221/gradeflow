import { ShieldCheck } from "lucide-react";

import { validPoints, type BuilderCopy, type CriterionDraft } from "@/components/assignments/rubric-draft";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/** Live summary beside the rubric builder (lg and up). */
export function RubricSummary({
  criteria,
  totalPoints,
  dueLabel,
  templateName,
  kindLabel,
  copy,
}: {
  criteria: CriterionDraft[];
  totalPoints: number;
  dueLabel: string | null;
  templateName: string | null;
  /** "Essay" or "Handwritten test". */
  kindLabel: string;
  copy: BuilderCopy;
}) {
  return (
    <aside className="hidden lg:sticky lg:top-20 lg:block" aria-label="Rubric summary">
      <Card>
        <CardHeader className="pb-0">
          <CardTitle>
            <h2>Summary</h2>
          </CardTitle>
          <CardDescription>Updates as you build the {copy.noun === "question" ? "test" : "rubric"}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="tabular text-3xl font-semibold tracking-tight text-foreground">{totalPoints}</p>
              <p className="text-[13px] text-muted-foreground">total points</p>
            </div>
            <div>
              <p className="tabular text-3xl font-semibold tracking-tight text-foreground">{criteria.length}</p>
              <p className="text-[13px] text-muted-foreground">{criteria.length === 1 ? copy.noun : copy.nounPlural}</p>
            </div>
          </div>
          <ul className="space-y-3">
            {criteria.map((criterion, index) => {
              const points = validPoints(criterion.maxPoints);
              return (
                <li key={criterion.key} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span
                      className={cn(
                        "min-w-0 truncate",
                        criterion.title.trim() ? "text-foreground" : "text-muted-foreground italic"
                      )}
                    >
                      {criterion.title.trim() || `${copy.itemLabel} ${index + 1}`}
                    </span>
                    <span className="tabular shrink-0 text-muted-foreground">{points || "–"} pts</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-muted-foreground/40 transition-[width] duration-300"
                      style={{ width: totalPoints > 0 ? `${(points / totalPoints) * 100}%` : "0%" }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <Separator />
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Type</dt>
            <dd className="text-right text-foreground">{kindLabel}</dd>
            <dt className="text-muted-foreground">Due</dt>
            <dd className="text-right text-foreground">{dueLabel ?? "No due date"}</dd>
            <dt className="text-muted-foreground">Template</dt>
            <dd className="truncate text-right text-foreground">{templateName ?? "None"}</dd>
          </dl>
          <p className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2.5 text-[13px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
            AI scores are suggestions. A grade publishes only when you approve it.
          </p>
        </CardContent>
      </Card>
    </aside>
  );
}
