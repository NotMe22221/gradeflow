import { Clock, FileCheck2, Scale, type LucideIcon } from "lucide-react";

import { ILLUSTRATIVE_MINUTES_SAVED_PER_PAPER } from "@/lib/constants";
import { formatPoints, pluralize } from "@/lib/format";
import type { DashboardStats } from "@/lib/stats";
import { cn } from "@/lib/utils";

/** "~12 min", "~1.5 hrs". Always approximate: it is an illustrative estimate. */
export function formatTimeSaved(minutes: number): { value: string; unit: string } {
  if (minutes <= 0) return { value: "0", unit: "min" };
  if (minutes < 60) return { value: `~${Math.round(minutes)}`, unit: "min" };
  const hours = Math.round(minutes / 6) / 10;
  return { value: `~${formatPoints(hours)}`, unit: hours === 1 ? "hr" : "hrs" };
}

function Stat({
  label,
  icon: Icon,
  value,
  unit,
  srValue,
  badge,
  children,
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  unit?: string;
  /** Spoken form of value + unit when the visual form reads poorly. */
  srValue?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // Phones: label and note on the left, the number on the right. From md: stacked columns.
    <div className="flex min-w-0 items-center gap-4 px-4 py-3 md:items-start md:px-5 md:py-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground md:mt-0.5">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 [grid-template-areas:'label_value'_'note_value'] md:grid-cols-1 md:[grid-template-areas:'label'_'value'_'note']">
        <h3 className="font-sans text-[13px] font-medium text-muted-foreground [grid-area:label]">{label}</h3>
        <div className="flex flex-col items-end gap-1 [grid-area:value] md:mt-0.5 md:flex-row md:flex-wrap md:items-center md:gap-x-2.5">
          <p className="flex items-baseline gap-1">
            <span
              className="tabular font-display text-2xl leading-8 font-medium text-foreground"
              aria-hidden={srValue ? true : undefined}
            >
              {value}
            </span>
            {unit ? (
              <span className="text-sm text-muted-foreground" aria-hidden={srValue ? true : undefined}>
                {unit}
              </span>
            ) : null}
            {srValue ? <span className="sr-only">{srValue}</span> : null}
          </p>
          {badge}
        </div>
        <p className="mt-0.5 text-xs leading-5 text-pretty text-muted-foreground [grid-area:note]">{children}</p>
      </div>
    </div>
  );
}

/**
 * Home's at-a-glance strip: papers graded this week, how far approved grades
 * moved from the AI draft, and the time-saved figure, which is always labelled
 * as an illustrative estimate (never a measurement).
 */
export function StatRow({ stats, className }: { stats: DashboardStats; className?: string }) {
  const diff = stats.avgAiFinalDiff;
  const diffUnit = diff === 1 ? "pt" : "pts";
  const timeSaved = formatTimeSaved(stats.timeSavedMinutes);

  return (
    <section
      aria-labelledby="dashboard-stats-heading"
      className={cn(
        "grid grid-cols-1 divide-y divide-border rounded-xl border border-border bg-card md:grid-cols-3 md:divide-x md:divide-y-0",
        className
      )}
    >
      <h2 id="dashboard-stats-heading" className="sr-only">
        Grading at a glance
      </h2>

      <Stat label="Papers graded this week" icon={FileCheck2} value={String(stats.gradedThisWeek)}>
        Published with your approval
      </Stat>

      {diff === null ? (
        <Stat label="Avg. AI vs. final difference" icon={Scale} value="–" srValue="No data yet">
          Approve a grade to see this.
        </Stat>
      ) : (
        <Stat
          label="Avg. AI vs. final difference"
          icon={Scale}
          value={`±${formatPoints(diff)}`}
          unit={diffUnit}
          srValue={`Plus or minus ${formatPoints(diff)} ${diff === 1 ? "point" : "points"}`}
        >
          Across {pluralize(stats.avgAiFinalDiffSample, "approved grade")}. Lower means fewer edits.
        </Stat>
      )}

      <Stat
        label="Time saved"
        icon={Clock}
        value={timeSaved.value}
        unit={timeSaved.unit}
        srValue={`About ${timeSaved.value.replace("~", "")} ${timeSaved.unit}, an illustrative estimate`}
        badge={
          <span className="inline-flex h-6 items-center rounded-full border border-dashed border-input/50 px-2 text-[11px] font-medium whitespace-nowrap text-muted-foreground">
            Illustrative estimate
          </span>
        }
      >
        Assumes ~{ILLUSTRATIVE_MINUTES_SAVED_PER_PAPER} minutes saved per paper. Not a measurement.
      </Stat>
    </section>
  );
}
