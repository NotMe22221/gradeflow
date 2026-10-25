import { BadgeCheck, MessageSquareText } from "lucide-react";

import { SubmissionText } from "@/components/student/submission-text";
import { Card } from "@/components/ui/card";
import { formatDate, formatPercent, formatPoints } from "@/lib/format";
import type { BreakdownItem } from "@/lib/grades/breakdown";

/** Share of a criterion earned, clamped to 0..100 for a progress bar. */
function scoreShare(score: number, max: number): number {
  if (!(max > 0)) return 0;
  return Math.max(0, Math.min(100, (score / max) * 100));
}

/**
 * The published grade, read-only. Everything here comes from the
 * PublishedGrade snapshot a teacher approved: never from the AI suggestion.
 */
export function GradeCard({
  totalScore,
  maxScore,
  breakdown,
  feedback,
  approvedByName,
  approvedAt,
  content,
  fileName,
}: {
  totalScore: number;
  maxScore: number;
  breakdown: BreakdownItem[];
  feedback: string | null;
  approvedByName: string;
  approvedAt: Date;
  content: string;
  fileName?: string | null;
}) {
  const overall = scoreShare(totalScore, maxScore);
  const overallFeedback = feedback?.trim();

  return (
    <Card className="overflow-hidden">
      <div className="space-y-5 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
              <BadgeCheck className="size-4 text-success" aria-hidden />
              Your grade
            </h2>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="tabular text-5xl font-semibold tracking-tight text-foreground">
                {formatPoints(totalScore)}
              </span>
              <span className="tabular text-2xl font-medium text-muted-foreground">
                / {formatPoints(maxScore)}
              </span>
              <span className="sr-only">points</span>
            </p>
          </div>
          <span className="tabular rounded-lg bg-secondary px-3 py-1.5 text-lg font-semibold text-foreground ring-1 ring-border">
            {formatPercent(totalScore, maxScore)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary" style={{ width: `${overall}%` }} />
        </div>
        <p className="text-sm text-muted-foreground">
          Approved by <span className="font-medium text-foreground">{approvedByName}</span> on{" "}
          <span className="tabular">{formatDate(approvedAt)}</span>
        </p>
      </div>

      <div className="border-t border-border px-6 py-6">
        <h3 className="text-sm font-semibold text-foreground">Rubric feedback</h3>
        {breakdown.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Per-criterion feedback isn&apos;t available for this grade. Your total above is final.
          </p>
        ) : (
          <ol className="mt-4 space-y-6">
            {breakdown.map((item) => (
              <li key={item.criterionId}>
                <div className="flex items-baseline justify-between gap-4">
                  <h4 className="min-w-0 text-sm font-medium text-foreground">{item.title}</h4>
                  <span className="tabular shrink-0 text-sm font-semibold text-foreground">
                    {formatPoints(item.score)}
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      / {formatPoints(item.maxPoints)}
                    </span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div
                    className="h-full rounded-full bg-primary/80"
                    style={{ width: `${scoreShare(item.score, item.maxPoints)}%` }}
                  />
                </div>
                {item.comment ? (
                  <p className="mt-3 text-sm leading-relaxed break-words whitespace-pre-line text-muted-foreground">
                    {item.comment}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>

      {overallFeedback ? (
        <div className="border-t border-border bg-muted/40 px-6 py-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquareText className="size-4 text-muted-foreground" aria-hidden />
            Overall feedback
          </h3>
          <figure className="mt-3">
            <blockquote className="text-[15px] leading-7 break-words whitespace-pre-line text-foreground">
              {overallFeedback}
            </blockquote>
            <figcaption className="mt-2 text-xs text-muted-foreground">{approvedByName}</figcaption>
          </figure>
        </div>
      ) : null}

      <SubmissionText content={content} fileName={fileName} />
    </Card>
  );
}
