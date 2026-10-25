import { PromptText } from "@/components/assignments/prompt-text";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pluralize } from "@/lib/format";

export type RubricCardCriterion = { id: string; title: string; description: string; maxPoints: number };

/** Read-only rubric: what the AI grades against and what you approve. */
export function RubricCard({ criteria }: { criteria: RubricCardCriterion[] }) {
  const total = criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-start gap-4 pb-4">
        <div className="min-w-0 space-y-1.5">
          <CardTitle>
            <h2>Rubric</h2>
          </CardTitle>
          <CardDescription>The AI scores each criterion and quotes the paper as evidence.</CardDescription>
        </div>
        <CardAction>
          <Badge variant="secondary" className="tabular">
            {pluralize(total, "pt")}
          </Badge>
        </CardAction>
      </CardHeader>
      {criteria.length === 0 ? (
        <CardContent className="pt-0 text-sm text-muted-foreground">
          This assignment has no rubric criteria, so the AI pass cannot run.
        </CardContent>
      ) : (
        <ol className="divide-y divide-border border-t border-border">
          {criteria.map((criterion, index) => (
            <li key={criterion.id} className="flex gap-4 px-6 py-4">
              <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground ring-1 ring-border">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-medium text-foreground">{criterion.title}</h3>
                  <span className="tabular shrink-0 text-sm text-muted-foreground">
                    {pluralize(criterion.maxPoints, "pt")}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{criterion.description}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function PromptCard({ instructions }: { instructions: string }) {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-4">
        <CardTitle>
          <h2>Prompt</h2>
        </CardTitle>
        <CardDescription>What students see when they submit.</CardDescription>
      </CardHeader>
      <CardContent className="border-t border-border pt-4">
        <PromptText text={instructions} />
      </CardContent>
    </Card>
  );
}
