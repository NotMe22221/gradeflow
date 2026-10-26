import { useId } from "react";
import {
  CircleCheck,
  CircleSlash,
  Flag,
  Info,
  Lightbulb,
  Mountain,
  ShieldCheck,
  TrendingUp,
  type IconComponent,
} from "@/components/icons";

import { GoalEngineBadge } from "@/components/student/goal-engine-badge";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate, formatDueDate, formatPoints, pluralize } from "@/lib/format";
import { formatPercentValue, LETTER_SCALE_NOTE, type GoalStatus } from "@/lib/goals/plan";
import type { GoalEngine, GoalPlanView } from "@/lib/goals/types";
import { cn } from "@/lib/utils";

const STATUS_ICONS: Record<GoalStatus, IconComponent> = {
  secured: CircleCheck,
  on_track: TrendingUp,
  stretch: Mountain,
  not_possible: CircleSlash,
  no_remaining: Flag,
};

export function GoalStatusPill({ plan, className }: { plan: Pick<GoalPlanView, "status" | "statusLabel" | "statusTone">; className?: string }) {
  const Icon = STATUS_ICONS[plan.status];
  return (
    <Badge variant={plan.statusTone} className={cn("px-2.5 py-1 text-[0.8125rem] [&>svg]:size-3.5", className)}>
      <Icon aria-hidden />
      {plan.statusLabel}
    </Badge>
  );
}

function percentText(value: number | null): string {
  return value === null ? "–" : `${formatPercentValue(value)}%`;
}

/** "Due Oct 24", or "Test day Oct 24" for a paper test. */
function taskDateLabel(task: GoalPlanView["tasks"][number]): string {
  if (task.paperTest) return task.dueDate ? `Test day ${formatDueDate(task.dueDate)}` : "No test date";
  return task.dueDate ? `Due ${formatDueDate(task.dueDate)}` : "No due date";
}

const STANDING_NOTE =
  "Points earned out of points possible on your approved grades. An average that counts each assignment equally can differ slightly.";

// Stat tiles. Below sm each tile is a two-column row: label over hint on the
// left, the number on the right. From sm up they are three columns, and every
// label reserves two lines so the numbers sit at the same height.
const TILE =
  "min-w-0 rounded-lg bg-secondary px-3 py-3 max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:items-center max-sm:gap-x-4 sm:px-4";
const TILE_LABEL =
  "text-[0.8125rem] leading-snug font-medium text-muted-foreground max-sm:col-start-1 max-sm:row-start-1 sm:min-h-[2lh]";
const TILE_VALUE =
  "tabular text-lg font-semibold break-words text-foreground max-sm:col-start-2 max-sm:row-span-2 max-sm:row-start-1 max-sm:text-right sm:mt-1 sm:text-xl";
const TILE_HINT = "tabular text-[0.75rem] leading-snug text-muted-foreground max-sm:col-start-1 max-sm:row-start-2";

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
  const tasksHeadingId = useId();
  const required = plan.requiredPercentOnRemaining;
  const showTasks = plan.status !== "no_remaining" && plan.tasks.length > 0;
  // Not possible: the list shows the best the student can do, which falls short.
  const reachable = plan.status !== "not_possible";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[0.8125rem] font-medium text-muted-foreground">Your target</p>
          <p className="font-display text-[1.25rem] leading-7 font-medium text-balance text-foreground">{plan.interpretation}</p>
          <p className="text-[0.8125rem] break-words text-muted-foreground">
            You wrote &ldquo;{plan.goalText}&rdquo;
            <span className="tabular"> · Saved {formatDate(plan.savedAt)}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <GoalStatusPill plan={plan} />
          <GoalEngineBadge engine={engine} model={model} />
        </div>
      </div>

      <p className="max-w-[65ch] text-[0.9375rem] leading-6 text-pretty text-foreground">{plan.statusMessage}</p>

      {/* Phones: one row per stat (label and hint left, number right). sm+: three tiles whose numbers line up. */}
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        <div className={TILE}>
          <dt className={TILE_LABEL}>
            <span>
              Current standing <span className="font-normal">(by points)</span>
            </span>
            {/* A popover, not a tooltip, so a tap opens it on phones. */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="How current standing is calculated"
                  className="relative ml-1 inline-flex size-4 translate-y-0.5 cursor-pointer items-center justify-center rounded-full align-baseline text-muted-foreground transition-colors outline-none after:absolute after:-inset-1.5 after:content-[''] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring data-[state=open]:text-foreground"
                >
                  <Info className="size-3.5" aria-hidden />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                aria-label="How current standing is calculated"
                className="w-[min(20rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed font-normal text-muted-foreground"
              >
                {STANDING_NOTE}
              </PopoverContent>
            </Popover>
          </dt>
          <dd className={TILE_VALUE}>{percentText(plan.currentPercent)}</dd>
          <dd className={TILE_HINT}>
            {plan.gradedCount > 0 ? `From ${pluralize(plan.gradedCount, "approved grade")}` : "No approved grades yet"}
          </dd>
        </div>
        <div className={TILE}>
          <dt className={TILE_LABEL}>Needed on what&apos;s left</dt>
          <dd className={TILE_VALUE}>
            {plan.status === "no_remaining"
              ? "–"
              : required !== null && required > 100
                ? "100%+"
                : percentText(required)}
          </dd>
          <dd className={TILE_HINT}>
            {plan.status === "no_remaining"
              ? "Nothing left"
              : `${formatPoints(Math.round(plan.requiredPoints * 10) / 10)} of ${formatPoints(plan.remainingMax)} pts`}
          </dd>
        </div>
        <div className={TILE}>
          <dt className={TILE_LABEL}>Best possible</dt>
          <dd className={TILE_VALUE}>
            {plan.earnedMax + plan.remainingMax > 0 ? percentText(plan.bestPossiblePercent) : "–"}
          </dd>
          <dd className={TILE_HINT}>With full marks on the rest</dd>
        </div>
      </dl>

      {showTasks ? (
        <section aria-labelledby={tasksHeadingId}>
          <h3 id={tasksHeadingId} className="text-[0.9375rem] font-medium text-foreground">
            {reachable ? "Score to aim for on each remaining assignment" : "Best you can do on each remaining assignment"}
          </h3>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {plan.tasks.map((task) => {
              const anyScore = plan.status === "secured" || task.neededScore === 0;
              return (
                <li key={task.assignmentId} className="flex items-center gap-3 bg-card px-3 py-3 sm:px-4">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[0.9375rem] font-medium break-words text-foreground">{task.title}</p>
                    <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
                      <span className="tabular">{taskDateLabel(task)}</span>
                      {task.pastDue ? <span className="font-medium text-danger-soft-foreground"> · Missing</span> : null}
                      {task.awaitingScan ? <span> · Waiting for your teacher to scan it</span> : null}
                      {task.submitted ? <span> · Submitted, waiting for a grade</span> : null}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {anyScore ? (
                      <p className="text-[0.875rem] font-semibold text-success-soft-foreground">Any score</p>
                    ) : (
                      <>
                        <p className="tabular text-[0.9375rem] font-semibold text-foreground">
                          {formatPoints(task.neededScore)}
                          <span className="font-normal text-muted-foreground"> / {formatPoints(task.maxScore)}</span>
                          <span className="sr-only">{reachable ? " points needed" : " points possible"}</span>
                        </p>
                        <p className="tabular text-[0.75rem] text-muted-foreground">
                          {task.neededScore >= task.maxScore ? "Full marks" : `${formatPercentValue(task.neededPercent)}%`}
                        </p>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[0.8125rem] text-pretty text-muted-foreground">
            {reachable
              ? "Each score is rounded up to the nearest half point, so hitting every one reaches your goal."
              : `Full marks on all of these brings you to ${formatPercentValue(plan.bestPossiblePercent)}%, short of this goal.`}
          </p>
        </section>
      ) : null}

      <div className="flex gap-3 rounded-lg bg-secondary p-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card text-primary">
          <Lightbulb className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-[0.875rem] font-medium text-foreground">
            Study tip
            {engine === "openai" && plan.tipSource === "template" ? (
              <span className="font-normal text-muted-foreground"> · built-in</span>
            ) : null}
          </p>
          <p className="max-w-[65ch] text-[0.875rem] leading-6 text-pretty text-foreground">{plan.coachingTip}</p>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-border pt-4 text-[0.8125rem] text-muted-foreground">
        <p className="flex items-start gap-1.5">
          <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" aria-hidden />
          Scores are calculated from your teacher-approved grades.
        </p>
        <p className="text-pretty">{LETTER_SCALE_NOTE}</p>
      </div>
    </div>
  );
}
