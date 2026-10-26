import { BadgeCheck, Check, ClipboardList } from "lucide-react";

import { WORK_TONE_CLASS, type WorkStatus } from "@/components/student/todo-model";
import { formatDate, formatPercent, formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
 * The right-hand "Your work" card on a student's assignment page, as in
 * Google Classroom: the status in the top-right corner, then the returned
 * grade, the student's paper, and what they can do next.
 */

export function YourWorkCard({
  status,
  children,
  className,
}: {
  status: WorkStatus;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="your-work-heading"
      className={cn("rounded-xl border border-border bg-card p-5", className)}
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id="your-work-heading" className="text-[22px] leading-7 font-normal text-foreground">
          Your work
        </h2>
        <p className={cn("shrink-0 text-sm font-medium", WORK_TONE_CLASS[status.tone])}>
          <span className="sr-only">Status: </span>
          {status.label}
        </p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** The returned grade at the top of Your work. Only ever a teacher-approved PublishedGrade. */
export function ReturnedGrade({
  totalScore,
  maxScore,
  approvedByName,
  approvedAt,
}: {
  totalScore: number;
  maxScore: number;
  approvedByName: string;
  approvedAt: Date;
}) {
  return (
    <div className="rounded-lg bg-secondary px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
        <BadgeCheck className="size-4 text-success" aria-hidden />
        Your grade
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="tabular font-display text-foreground">
          <span className="text-[40px] leading-none font-medium">{formatPoints(totalScore)}</span>
          <span className="text-xl text-muted-foreground"> / {formatPoints(maxScore)}</span>
          <span className="sr-only"> points</span>
        </p>
        <span className="tabular ml-auto rounded-full bg-card px-2.5 py-0.5 text-sm font-medium text-foreground">
          {formatPercent(totalScore, maxScore)}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Approved by <span className="font-medium text-foreground">{approvedByName}</span> on{" "}
        <span className="tabular">{formatDate(approvedAt)}</span>
      </p>
    </div>
  );
}

type Step = { label: string; detail?: string; state: "done" | "current" | "upcoming" };

/** Where a turned-in paper is: turned in, with the teacher, then returned. */
export function TurnedInSteps({ doneLabel, at }: { doneLabel: string; at: Date }) {
  const steps: Step[] = [
    { label: doneLabel, detail: formatDate(at), state: "done" },
    { label: "Teacher review", detail: "In progress", state: "current" },
    { label: "Grade returned", state: "upcoming" },
  ];
  return (
    <ol className="space-y-0" aria-label="Grading progress">
      {steps.map((step, index) => (
        <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
          {index < steps.length - 1 ? (
            <span
              aria-hidden
              className={cn(
                "absolute top-6 bottom-0 left-[11px] w-px",
                step.state === "done" ? "bg-primary/50" : "bg-border"
              )}
            />
          ) : null}
          <span
            aria-hidden
            className={cn(
              "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full",
              step.state === "done" && "bg-primary text-primary-foreground",
              step.state === "current" && "border-2 border-primary bg-card",
              step.state === "upcoming" && "border border-border bg-card"
            )}
          >
            {step.state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : null}
            {step.state === "current" ? <span className="size-2 animate-pulse rounded-full bg-primary" /> : null}
          </span>
          <span className="min-w-0 pt-0.5">
            <span
              className={cn(
                "block text-sm leading-5 font-medium",
                step.state === "upcoming" ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {step.label}
              <span className="sr-only">
                {step.state === "done" ? ", done" : step.state === "current" ? ", in progress" : ", not yet"}
              </span>
            </span>
            {step.detail ? <span className="tabular block text-xs text-muted-foreground">{step.detail}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * A paper test has nothing to upload: the student takes it in class and the
 * teacher scans it. Once the test day has passed, it's waiting on the
 * teacher, never missing.
 */
export function PaperTestNotice({
  teacherName,
  testDay,
  awaitingScan,
  sentBack = false,
}: {
  teacherName: string | null;
  testDay: Date | null;
  awaitingScan: boolean;
  sentBack?: boolean;
}) {
  const teacher = teacherName ?? "Your teacher";
  return (
    <div className="flex gap-3 rounded-lg bg-secondary px-4 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-primary">
        <ClipboardList className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">
          {sentBack ? "Talk with your teacher about next steps" : "Your teacher scans this test"}
        </p>
        <p className="text-[13px] text-pretty text-muted-foreground">
          {sentBack ? (
            <>{teacher} scans any new paper for you. There&apos;s nothing to upload.</>
          ) : awaitingScan && testDay ? (
            <>
              The test was on <span className="tabular">{formatDate(testDay)}</span>. {teacher} scans the papers, and
              your grade appears here once it&apos;s approved. There&apos;s nothing to upload.
            </>
          ) : (
            <>
              You take it in class on paper. {teacher} scans it afterward, and your grade appears here once it&apos;s
              approved. There&apos;s nothing to upload.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
