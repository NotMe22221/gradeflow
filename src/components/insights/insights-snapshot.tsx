import { ShieldCheck } from "lucide-react";

import { HEAT_TONE } from "@/components/insights/heat-tone";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pluralize } from "@/lib/format";
import { averageDistribution, formatHeatPercent, type ClassHeatmap } from "@/lib/insights/heatmap";
import { cn } from "@/lib/utils";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular mt-0.5 text-xl font-semibold tracking-tight text-foreground">{value}</dd>
      {hint ? <dd className="tabular truncate text-xs text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}

/**
 * How the students' averages spread across the heatmap's color bands: a
 * segmented bar (low to high, same colors as the cells) and the count per band.
 */
function AverageSpread({ heatmap }: { heatmap: ClassHeatmap }) {
  const { bands, graded, ungraded } = averageDistribution(heatmap.rows);
  if (graded === 0) return null;

  return (
    <div className="px-6 pb-6">
      <h3 id="average-spread-heading" className="text-xs text-muted-foreground">
        Student averages
      </h3>
      <div aria-hidden className="mt-2 flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
        {bands
          .filter((band) => band.count > 0)
          .map((band) => (
            <span
              key={band.key}
              className={cn("block h-full", HEAT_TONE[band.key].bar)}
              style={{ width: `${(band.count / graded) * 100}%` }}
            />
          ))}
      </div>
      <ul aria-labelledby="average-spread-heading" className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {bands.map((band) => (
          <li key={band.key} className="flex min-w-0 items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", HEAT_TONE[band.key].bar)} />
              <span className="tabular truncate">{band.label}</span>
            </span>
            <span className={cn("tabular font-medium", band.count > 0 ? "text-foreground" : "text-muted-foreground")}>
              {band.count}
              <span className="sr-only"> {band.count === 1 ? "student" : "students"}</span>
            </span>
          </li>
        ))}
        {ungraded > 0 ? (
          <li className="flex min-w-0 items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", HEAT_TONE.empty.bar)} />
              <span className="truncate">Not graded yet</span>
            </span>
            <span className="tabular font-medium text-foreground">
              {ungraded}
              <span className="sr-only"> {ungraded === 1 ? "student" : "students"}</span>
            </span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/** Class-level numbers next to the "most missed" ranking. Approved grades only. */
export function InsightsSnapshot({ heatmap }: { heatmap: ClassHeatmap }) {
  const graded = heatmap.rows.filter((row) => row.gradedCount > 0).length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle>
          <h2>Class snapshot</h2>
        </CardTitle>
        <CardDescription>Across the assignments in the heatmap.</CardDescription>
      </CardHeader>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 px-6 pb-6">
        <Stat label="Class average" value={formatHeatPercent(heatmap.classAverage)} />
        <Stat label="Approved grades" value={String(heatmap.publishedCount)} />
        <Stat label="Students graded" value={`${graded}/${heatmap.rows.length}`} />
        <Stat label="Criteria tracked" value={String(heatmap.columns.length)} hint={pluralize(heatmap.groups.length, "assignment")} />
      </dl>
      <AverageSpread heatmap={heatmap} />
      <div className="mt-auto space-y-2 border-t border-border px-6 py-4 text-xs text-pretty text-muted-foreground">
        <p className="flex items-start gap-2">
          <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" aria-hidden />
          <span>AI drafts waiting in the review queue never count here.</span>
        </p>
        {heatmap.hiddenAssignmentCount > 0 ? (
          <p className="tabular pl-5.5">
            {pluralize(heatmap.hiddenAssignmentCount, "assignment")} with no approved grades{" "}
            {heatmap.hiddenAssignmentCount === 1 ? "is" : "are"} left out.
          </p>
        ) : null}
      </div>
    </Card>
  );
}
