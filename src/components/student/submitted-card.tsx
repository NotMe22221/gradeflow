import { Check } from "lucide-react";

import { SubmissionText } from "@/components/student/submission-text";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Step = { label: string; detail?: string; state: "done" | "current" | "upcoming" };

/**
 * Shown for every in-progress status. The student sees one calm "your teacher
 * is reviewing it" state; whether the AI pass has run is not their concern.
 */
export function SubmittedCard({
  submittedAt,
  returnedAt,
  content,
  fileName,
}: {
  submittedAt: Date;
  /** Set when this is a resubmission after a send-back. */
  returnedAt?: Date | null;
  content: string;
  fileName?: string | null;
}) {
  const resubmitted = !!returnedAt && submittedAt.getTime() > returnedAt.getTime();
  const steps: Step[] = [
    { label: resubmitted ? "Resubmitted" : "Submitted", detail: formatDate(submittedAt), state: "done" },
    { label: "Teacher review", detail: "In progress", state: "current" },
    { label: "Grade published", state: "upcoming" },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="space-y-6 p-6">
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {resubmitted ? "Resubmitted" : "Submitted"} {formatDate(submittedAt)}
          </h2>
          <p className="max-w-prose text-sm text-pretty text-muted-foreground">
            Your teacher is reviewing it. Your grade will appear here once your teacher approves it.
          </p>
        </div>

        <ol className="grid gap-3 sm:grid-cols-3 sm:gap-0" aria-label="Grading progress">
          {steps.map((step, index) => (
            <li
              key={step.label}
              className="relative flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2.5 sm:pr-4"
            >
              {index < steps.length - 1 ? (
                <span
                  className={cn(
                    "absolute top-3 left-6 hidden h-px w-[calc(100%-1.5rem)] sm:block",
                    step.state === "done" ? "bg-foreground/25" : "bg-border"
                  )}
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                  step.state === "done" && "bg-foreground text-background",
                  step.state === "current" && "border-2 border-foreground bg-card",
                  step.state === "upcoming" && "border border-border bg-card"
                )}
                aria-hidden
              >
                {step.state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : null}
                {step.state === "current" ? (
                  <span className="size-2 animate-pulse rounded-full bg-foreground" />
                ) : null}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    step.state === "upcoming" ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {step.label}
                  <span className="sr-only">
                    {step.state === "done"
                      ? ", done"
                      : step.state === "current"
                        ? ", in progress"
                        : ", not yet"}
                  </span>
                </span>
                {step.detail ? (
                  <span className="tabular block text-xs text-muted-foreground">{step.detail}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <SubmissionText content={content} fileName={fileName} />
    </Card>
  );
}
