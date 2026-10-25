import { Clock, FileCheck2, Scale, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

function StatCard({
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
    <Card className="min-w-0 p-6">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground ring-1 ring-border">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="flex items-baseline gap-1.5">
          <span
            className="tabular text-3xl font-semibold tracking-tight text-foreground"
            aria-hidden={srValue ? true : undefined}
          >
            {value}
          </span>
          {unit ? (
            <span className="text-sm font-medium text-muted-foreground" aria-hidden={srValue ? true : undefined}>
              {unit}
            </span>
          ) : null}
          {srValue ? <span className="sr-only">{srValue}</span> : null}
        </p>
        {badge}
      </div>
      <p className="mt-2 text-sm text-pretty text-muted-foreground">{children}</p>
    </Card>
  );
}

export function StatRow({ stats, className }: { stats: DashboardStats; className?: string }) {
  const diff = stats.avgAiFinalDiff;
  const diffUnit = diff === 1 ? "pt" : "pts";
  const timeSaved = formatTimeSaved(stats.timeSavedMinutes);

  return (
    <section aria-labelledby="dashboard-stats-heading" className={cn("grid grid-cols-1 gap-4 md:grid-cols-3", className)}>
      <h2 id="dashboard-stats-heading" className="sr-only">
        Grading at a glance
      </h2>

      <StatCard label="Papers graded this week" icon={FileCheck2} value={String(stats.gradedThisWeek)}>
        Published with your approval
      </StatCard>

      {diff === null ? (
        <StatCard label="Avg. AI vs. final difference" icon={Scale} value="–" srValue="No data yet">
          Approve a grade to see this.
        </StatCard>
      ) : (
        <StatCard
          label="Avg. AI vs. final difference"
          icon={Scale}
          value={`±${formatPoints(diff)}`}
          unit={diffUnit}
          srValue={`Plus or minus ${formatPoints(diff)} ${diff === 1 ? "point" : "points"}`}
        >
          Across {pluralize(stats.avgAiFinalDiffSample, "approved grade")}. Lower means fewer edits.
        </StatCard>
      )}

      <StatCard
        label="Time saved"
        icon={Clock}
        value={timeSaved.value}
        unit={timeSaved.unit}
        srValue={`About ${timeSaved.value.replace("~", "")} ${timeSaved.unit}, an illustrative estimate`}
        badge={
          <Badge variant="outline" className="border-dashed">
            Illustrative estimate
          </Badge>
        }
      >
        Assumes ~{ILLUSTRATIVE_MINUTES_SAVED_PER_PAPER} minutes saved per paper. Not a measurement.
      </StatCard>
    </section>
  );
}
