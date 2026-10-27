import { ListChecks } from "@/components/icons";

import { formatPoints, pluralize } from "@/lib/format";
import type { BreakdownItem } from "@/lib/grades/breakdown";
import { cn } from "@/lib/utils";

export type StudentRubricCriterion = {
  id: string;
  title: string;
  description: string;
  maxPoints: number;
};

/** Share of a criterion earned, clamped to 0..100 for a bar. */
function share(score: number, max: number): number {
  if (!(max > 0)) return 0;
  return Math.max(0, Math.min(100, (score / max) * 100));
}

/**
 * The rubric as the student sees it, like Classroom's Rubric view: criteria
 * and points, and once a grade is returned, the score and the teacher's
 * comment on each. For a paper test ("questions") each criterion is a
 * question and its description is the teacher's answer key, so only titles,
 * points, and returned scores ever show.
 *
 * `breakdown` comes only from the teacher-approved PublishedGrade snapshot,
 * never from an AI suggestion.
 */
export function AssignmentRubric({
  criteria,
  variant = "rubric",
  breakdown,
  className,
}: {
  criteria: StudentRubricCriterion[];
  variant?: "rubric" | "questions";
  /** The returned grade's per-criterion scores and comments. */
  breakdown?: BreakdownItem[];
  className?: string;
}) {
  const questions = variant === "questions";
  const graded = breakdown !== undefined;
  const total = criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  const descriptions = new Map(criteria.map((criterion) => [criterion.id, criterion.description]));

  const title = graded ? (questions ? "Feedback by question" : "Rubric feedback") : questions ? "Questions" : "Rubric";
  const items = graded
    ? breakdown.map((item) => ({
        id: item.criterionId,
        title: item.title,
        maxPoints: item.maxPoints,
        score: item.score as number | null,
        comment: item.comment,
        description: descriptions.get(item.criterionId) ?? null,
      }))
    : criteria.map((criterion) => ({
        id: criterion.id,
        title: criterion.title,
        maxPoints: criterion.maxPoints,
        score: null as number | null,
        comment: "",
        description: criterion.description,
      }));
  const earned = graded ? breakdown.reduce((sum, item) => sum + item.score, 0) : 0;
  const possible = graded ? breakdown.reduce((sum, item) => sum + item.maxPoints, 0) : total;

  return (
    <section
      aria-labelledby="rubric-heading"
      className={cn("overflow-hidden rounded-3xl border border-border bg-card", className)}
    >
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3.5 sm:px-5">
        <h2 id="rubric-heading" className="flex items-center gap-2 text-[1.0625rem] font-extrabold tracking-[-0.01em] text-foreground">
          <ListChecks className="size-5 text-muted-foreground" aria-hidden />
          {title}
        </h2>
        {items.length > 0 ? (
          <span className="tabular text-sm text-muted-foreground">
            {graded ? `${formatPoints(earned)} / ${formatPoints(possible)}` : pluralize(possible, "point")}
          </span>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">
          {graded
            ? "Per-criterion feedback isn't available for this grade. Your total is final."
            : "Your teacher hasn't added rubric criteria yet."}
        </p>
      ) : (
        <ol className="divide-y divide-border">
          {items.map((item, index) => (
            <li key={item.id} className="flex gap-3 px-4 py-4 sm:px-5">
              <span
                className="tabular mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground"
                aria-hidden
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-sans text-[0.9375rem] leading-6 font-medium text-foreground">{item.title}</h3>
                  <span className="tabular shrink-0 text-sm leading-6 text-muted-foreground">
                    {item.score !== null ? (
                      <>
                        <span className="font-semibold text-foreground">{formatPoints(item.score)}</span> /{" "}
                        {formatPoints(item.maxPoints)}
                      </>
                    ) : (
                      `${formatPoints(item.maxPoints)} pts`
                    )}
                  </span>
                </div>
                {item.score !== null ? (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${share(item.score, item.maxPoints)}%` }}
                    />
                  </div>
                ) : null}
                {item.comment ? (
                  <p className="mt-2.5 max-w-[65ch] text-[0.9375rem] leading-6 break-words whitespace-pre-line text-foreground">
                    {item.comment}
                  </p>
                ) : null}
                {!questions && item.description ? (
                  <p className="mt-1.5 max-w-[65ch] text-[0.875rem] leading-relaxed break-words whitespace-pre-line text-muted-foreground">
                    <span className="font-medium text-foreground">Full credit: </span>
                    {item.description}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
      {questions && items.length > 0 && !graded ? (
        <p className="border-t border-border px-4 py-3 text-[0.8125rem] text-pretty text-muted-foreground sm:px-5">
          Your teacher keeps the answer key. Feedback on a returned test may point to what each question was looking
          for.
        </p>
      ) : null}
    </section>
  );
}
