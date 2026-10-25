import {
  CircleCheck,
  CircleSlash,
  Flag,
  Lightbulb,
  Mountain,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { GoalEngineBadge } from "@/components/student/goal-engine-badge";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPoints, pluralize } from "@/lib/format";
import { formatPercentValue, LETTER_SCALE_NOTE, type GoalStatus } from "@/lib/goals/plan";
import type { GoalEngine, GoalPlanView } from "@/lib/goals/types";
import { cn } from "@/lib/utils";

const STATUS_ICONS: Record<GoalStatus, LucideIcon> = {
  secured: CircleCheck,
  on_track: TrendingUp,
  stretch: Mountain,
  not_possible: CircleSlash,
  no_remaining: Flag,
};

export function GoalStatusPill({ plan, className }: { plan: Pick<GoalPlanView, "status" | "statusLabel" | "statusTone">; className?: string }) {
  const Icon = STATUS_ICONS[plan.status];
  return (
    <Badge variant={plan.statusTone} className={cn("px-2.5 py-1 text-[13px] [&>svg]:size-3.5", className)}>
      <Icon aria-hidden />
      {plan.statusLabel}
    </Badge>
  );
}

function percentText(value: number | null): string {
  return value === null ? "–" : `${formatPercentValue(value)}%`;
}

/**
 * A computed goal plan. Every number comes from code (src/lib/goals/plan.ts)
 * and the student's teacher-approved grades; the engine badge says what read
 * the goal and wrote the tip.
 */
export function GoalPlanResult({
  plan,
  engine,
  model,
}: {
  plan: GoalPlanView;
  /** null: a saved goal re-planned on page load. */
  engine: GoalEngine | null;
  model: string | null;
}) {
  const required = plan.requiredPercentOnRemaining;
  const showTasks = plan.status !== "no_remaining" && plan.tasks.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[13px] font-medium text-muted-foreground">Your target</p>
          <p className="text-xl font-semibold tracking-tight text-balance text-foreground">{plan.interpretation}</p>
          <p className="text-[13px] break-words text-muted-foreground">
            You wrote &ldquo;{plan.goalText}&rdquo;
            <span className="tabular"> · Saved {formatDate(plan.savedAt)}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <GoalStatusPill plan={plan} />
          <GoalEngineBadge engine={engine} model={model} />
        </div>
      </div>

      <p className="text-sm text-pretty text-foreground/90">{plan.statusMessage}</p>

      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="min-w-0 rounded-lg border border-border bg-background/60 px-3 py-3 sm:px-4">
          <dt className="text-[11px] leading-tight font-medium text-muted-foreground sm:text-xs">Current standing</dt>
          <dd className="tabular mt-1 text-base font-semibold break-words text-foreground sm:text-xl">{percentText(plan.currentPercent)}</dd>
          <dd className="tabular text-[11px] leading-tight text-muted-foreground sm:text-xs">
            {plan.gradedCount > 0 ? `From ${pluralize(plan.gradedCount, "approved grade")}` : "No approved grades yet"}
          </dd>
        </div>
        <div className="min-w-0 rounded-lg border border-border bg-background/60 px-3 py-3 sm:px-4">
          <dt className="text-[11px] leading-tight font-medium text-muted-foreground sm:text-xs">Needed on what&apos;s left</dt>
          <dd className="tabular mt-1 text-base font-semibold break-words text-foreground sm:text-xl">
            {plan.status === "no_remaining"
              ? "–"
              : required !== null && required > 100
                ? "100%+"
                : percentText(required)}
          </dd>
          <dd className="tabular text-[11px] leading-tight text-muted-foreground sm:text-xs">
            {plan.status === "no_remaining"
              ? "Nothing left"
              : `${formatPoints(Math.round(plan.requiredPoints * 10) / 10)} of ${formatPoints(plan.remainingMax)} pts`}
          </dd>
        </div>
        <div className="min-w-0 rounded-lg border border-border bg-background/60 px-3 py-3 sm:px-4">
          <dt className="text-[11px] leading-tight font-medium text-muted-foreground sm:text-xs">Best possible</dt>
          <dd className="tabular mt-1 text-base font-semibold break-words text-foreground sm:text-xl">
            {plan.earnedMax + plan.remainingMax > 0 ? percentText(plan.bestPossiblePercent) : "–"}
          </dd>
          <dd className="text-[11px] leading-tight text-muted-foreground sm:text-xs">With full marks on the rest</dd>
        </div>
      </dl>

      {showTasks ? (
        <section aria-labelledby="plan-tasks-heading">
          <h3 id="plan-tasks-heading" className="text-sm font-semibold text-foreground">
            Score to aim for on each remaining assignment
          </h3>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {plan.tasks.map((task) => {
              const anyScore = plan.status === "secured" || task.neededScore === 0;
              return (
                <li key={task.assignmentId} className="flex items-center gap-3 bg-card px-3 py-3 sm:px-4">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium break-words text-foreground">{task.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="tabular">{task.dueDate ? `Due ${formatDate(task.dueDate)}` : "No due date"}</span>
                      {task.pastDue ? <span className="font-medium text-danger-soft-foreground"> · Overdue</span> : null}
                      {task.submitted ? <span> · Submitted, waiting for a grade</span> : null}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {anyScore ? (
                      <p className="text-sm font-semibold text-success-soft-foreground">Any score</p>
                    ) : (
                      <>
                        <p className="tabular text-sm font-semibold text-foreground">
                          {formatPoints(task.neededScore)}
                          <span className="font-normal text-muted-foreground"> / {formatPoints(task.maxScore)}</span>
                          <span className="sr-only"> points needed</span>
                        </p>
                        <p className="tabular text-xs text-muted-foreground">
                          {task.neededScore >= task.maxScore ? "Full marks" : `${formatPercentValue(task.neededPercent)}%`}
                        </p>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Each score is rounded up to the nearest half point, so hitting every one reaches your goal.
          </p>
        </section>
      ) : null}

      <div className="flex gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground shadow-card ring-1 ring-border">
          <Lightbulb className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">
            Study tip
            {engine === "openai" && plan.tipSource === "template" ? (
              <span className="font-normal text-muted-foreground"> · built-in</span>
            ) : null}
          </p>
          <p className="text-sm text-pretty text-muted-foreground">{plan.coachingTip}</p>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
        <p className="flex items-start gap-1.5">
          <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" aria-hidden />
          Scores are calculated from your teacher-approved grades.
        </p>
        <p className="text-pretty">{LETTER_SCALE_NOTE}</p>
      </div>
    </div>
  );
}
