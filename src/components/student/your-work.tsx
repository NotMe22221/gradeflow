import { BadgeCheck, Check, ClipboardList } from "@/components/icons";

import type { WorkStatus } from "@/components/student/todo-model";
import { WorkStatusChip } from "@/components/student/work-status-chip";
import { formatDate, formatDueDate, formatPercent, formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
 * The right-hand "Your work" card on a student's assignment page, as in
 * Google Classroom: the status (icon and word) in the top-right corner, then
 * the returned grade, the student's paper, and what they can do next. Turn
 * in is the page's one filled button.
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
      className={cn("rounded-3xl border border-border bg-card p-5 sm:p-6", className)}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="your-work-heading" className="font-display text-[1.5rem] leading-7 font-extrabold tracking-[-0.02em] text-foreground">
          Your work
        </h2>
        <p className="shrink-0">
          <WorkStatusChip status={status} srPrefix />
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
  timeZone,
}: {
  totalScore: number;
  maxScore: number;
  approvedByName: string;
  approvedAt: Date;
  /** The viewer's time zone; undefined uses the server's. */
  timeZone?: string;
}) {
  return (
    <div className="rounded-2xl bg-secondary px-4 py-4">
      <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground">
        <BadgeCheck className="size-4 text-success" aria-hidden />
        Your grade
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="tabular font-display text-foreground">
          <span className="text-[2.75rem] leading-none font-extrabold tracking-[-0.03em]">{formatPoints(totalScore)}</span>
          <span className="text-xl text-muted-foreground"> / {formatPoints(maxScore)}</span>
          <span className="sr-only"> points</span>
        </p>
        <span className="tabular ml-auto rounded-full bg-card px-3 py-1 text-sm font-semibold text-foreground">
          {formatPercent(totalScore, maxScore)}
        </span>
      </div>
      <p className="mt-2 text-[0.8125rem] text-muted-foreground">
        Approved by <span className="font-medium text-foreground">{approvedByName}</span> on{" "}
        <span className="tabular">{formatDate(approvedAt, timeZone)}</span>
      </p>
    </div>
  );
}

type Step = { label: string; detail?: string; state: "done" | "current" | "upcoming" };

/** Where a turned-in paper is: turned in, with the teacher, then returned. */
export function TurnedInSteps({ doneLabel, at, timeZone }: { doneLabel: string; at: Date; timeZone?: string }) {
  const steps: Step[] = [
    { label: doneLabel, detail: formatDate(at, timeZone), state: "done" },
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
            {step.state === "current" ? <span className="size-2 rounded-full bg-primary" /> : null}
          </span>
          <span className="min-w-0 pt-0.5">
            <span
              className={cn(
                "block text-[0.875rem] leading-5 font-medium",
                step.state === "upcoming" ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {step.label}
              <span className="sr-only">
                {step.state === "done" ? ", done" : step.state === "current" ? ", in progress" : ", not yet"}
              </span>
            </span>
            {step.detail ? <span className="tabular block text-[0.8125rem] text-muted-foreground">{step.detail}</span> : null}
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
    <div className="flex gap-3 rounded-2xl bg-secondary px-4 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-primary">
        <ClipboardList className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-[0.875rem] font-medium text-foreground">
          {sentBack ? "Talk with your teacher about next steps" : "Your teacher scans this test"}
        </p>
        <p className="text-[0.8125rem] text-pretty text-muted-foreground">
          {sentBack ? (
            <>{teacher} scans any new paper for you. There&apos;s nothing to upload.</>
          ) : awaitingScan && testDay ? (
            <>
              The test was on <span className="tabular">{formatDueDate(testDay)}</span>. {teacher} scans the papers, and
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
