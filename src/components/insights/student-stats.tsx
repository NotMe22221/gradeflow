import { CircleAlert, FileCheck2, Hourglass, Percent, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { pluralize } from "@/lib/format";
import { formatHeatPercent } from "@/lib/insights/heatmap";
import type { StudentProfile } from "@/lib/insights/profile";

function StatTile({
  label,
  icon: Icon,
  value,
  srValue,
  hint,
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  srValue?: string;
  hint: string;
}) {
  return (
    <Card className="min-w-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground ring-1 ring-border">
          <Icon className="size-3.5" aria-hidden />
        </span>
      </div>
      <p className="tabular mt-1 text-2xl font-semibold tracking-tight text-foreground">
        <span aria-hidden={srValue ? true : undefined}>{value}</span>
        {srValue ? <span className="sr-only">{srValue}</span> : null}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground" title={hint}>
        {hint}
      </p>
    </Card>
  );
}

/** The student's standing in this class. Scores come from approved grades only. */
export function StudentStats({ profile, assignmentCount }: { profile: StudentProfile; assignmentCount: number }) {
  const { stats } = profile;
  const missingHint =
    stats.returnedCount > 0
      ? `Past due · ${pluralize(stats.returnedCount, "paper")} sent back`
      : "Past due, nothing submitted";

  return (
    <section aria-label="Grade summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatTile
        label="Average"
        icon={Percent}
        value={formatHeatPercent(stats.averagePercent)}
        srValue={stats.averagePercent === null ? "No approved grades yet" : undefined}
        hint="Approved grades only"
      />
      <StatTile
        label="Published"
        icon={FileCheck2}
        value={String(stats.publishedCount)}
        hint={`of ${pluralize(assignmentCount, "assignment")}`}
      />
      <StatTile label="In review" icon={Hourglass} value={String(stats.inReviewCount)} hint="Waiting for your approval" />
      <StatTile label="Missing" icon={CircleAlert} value={String(stats.missingCount)} hint={missingHint} />
    </section>
  );
}
