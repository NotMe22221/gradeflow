import { ShieldCheck } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pluralize } from "@/lib/format";
import { formatHeatPercent, type ClassHeatmap } from "@/lib/insights/heatmap";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular mt-0.5 text-xl font-semibold tracking-tight text-foreground">{value}</dd>
      {hint ? <dd className="tabular truncate text-xs text-muted-foreground">{hint}</dd> : null}
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
