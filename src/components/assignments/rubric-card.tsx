import { PromptText } from "@/components/assignments/prompt-text";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssignmentKind } from "@/lib/constants";
import { pluralize } from "@/lib/format";

export type RubricCardCriterion = { id: string; title: string; description: string; maxPoints: number };

/**
 * Read-only rubric: what the AI grades against and what you approve. For a
 * handwritten test it is the answer key: one row per question, with the
 * answer that earns full credit.
 */
export function RubricCard({ criteria, kind = "ESSAY" }: { criteria: RubricCardCriterion[]; kind?: AssignmentKind }) {
  const total = criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  const test = kind === "TEST";
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-start gap-4 pb-4">
        <div className="min-w-0 space-y-1.5">
          <CardTitle>
            <h2>{test ? "Answer key" : "Rubric"}</h2>
          </CardTitle>
          <CardDescription>
            {test
              ? "The AI reads each answer from the photo and scores it against this key."
              : "The AI scores each criterion and quotes the paper as evidence."}
          </CardDescription>
        </div>
        <CardAction>
          <Badge variant="secondary" className="tabular">
            {pluralize(total, "pt")}
          </Badge>
        </CardAction>
      </CardHeader>
      {criteria.length === 0 ? (
        <CardContent className="pt-0 text-sm text-muted-foreground">
          {test
            ? "This test has no questions yet, so scans cannot be graded."
            : "This assignment has no rubric criteria, so the AI pass cannot run."}
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
                  <h3 className="min-w-0 text-sm font-medium break-words text-foreground">{criterion.title}</h3>
                  <span className="tabular shrink-0 text-sm text-muted-foreground">
                    {pluralize(criterion.maxPoints, "pt")}
                  </span>
                </div>
                {test ? <p className="sr-only">Answer key:</p> : null}
                <p className="text-sm leading-relaxed text-pretty break-words whitespace-pre-line text-muted-foreground">
                  {criterion.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function PromptCard({ instructions, kind = "ESSAY" }: { instructions: string; kind?: AssignmentKind }) {
  const test = kind === "TEST";
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-4">
        <CardTitle>
          <h2>{test ? "Directions" : "Prompt"}</h2>
        </CardTitle>
        <CardDescription>
          {test ? "Printed on the test. The AI reads them with the answer key." : "What students see when they submit."}
        </CardDescription>
      </CardHeader>
      <CardContent className="border-t border-border pt-4">
        <PromptText text={instructions} />
      </CardContent>
    </Card>
  );
}
