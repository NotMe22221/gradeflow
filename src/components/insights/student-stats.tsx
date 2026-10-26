import { CircleAlert, ClipboardCheck, FileCheck2, Percent, type LucideIcon } from "lucide-react";

import { pluralize } from "@/lib/format";
import { formatHeatPercent } from "@/lib/insights/heatmap";
import type { StudentProfile } from "@/lib/insights/profile";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "warning" | "danger";

const TONE: Record<Tone, { icon: string; value: string }> = {
  neutral: { icon: "bg-primary-soft text-primary-soft-foreground", value: "text-foreground" },
  warning: { icon: "bg-warning-soft text-warning-soft-foreground", value: "text-foreground" },
  danger: { icon: "bg-danger-soft text-danger-soft-foreground", value: "text-danger" },
};

function StatTile({
  label,
  icon: Icon,
  value,
  srValue,
  hint,
  tone = "neutral",
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  srValue?: string;
  hint: string;
  tone?: Tone;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-2.5 bg-card p-4 sm:flex-row sm:gap-4 sm:p-5">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full sm:size-10", TONE[tone].icon)}>
        <Icon className="size-[18px] sm:size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <h2 className="font-sans text-[13px] font-medium text-muted-foreground">{label}</h2>
        <p className={cn("tabular font-display text-2xl leading-8 font-medium", TONE[tone].value)}>
          <span aria-hidden={srValue ? true : undefined}>{value}</span>
          {srValue ? <span className="sr-only">{srValue}</span> : null}
        </p>
        <p className="text-xs leading-5 text-pretty text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

/**
 * The student's standing in this class, as one strip of tiles (two by two on
 * a phone). Scores come from approved grades only. Status colors appear only
 * when something needs attention (work waiting for review, missing work).
 */
export function StudentStats({ profile, assignmentCount }: { profile: StudentProfile; assignmentCount: number }) {
  const { stats } = profile;
  const missingHint =
    stats.returnedCount > 0
      ? `Past due · ${pluralize(stats.returnedCount, "paper")} sent back`
      : "Past due, nothing turned in";
  // Papers with no AI pass yet are not in the review queue, so they never read as "waiting for your approval".
  const inReviewHint =
    stats.readyCount > 0 ? `${stats.readyCount} ready for AI pass` : "Waiting for your approval";

  return (
    <section
      aria-label="Grade summary"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4"
    >
      <StatTile
        label="Average"
        icon={Percent}
        value={formatHeatPercent(stats.averagePercent)}
        srValue={stats.averagePercent === null ? "No approved grades yet" : undefined}
        hint="Approved grades only"
      />
      <StatTile
        label="Returned"
        icon={FileCheck2}
        value={String(stats.publishedCount)}
        hint={`of ${pluralize(assignmentCount, "assignment")}`}
      />
      <StatTile
        label="To review"
        icon={ClipboardCheck}
        value={String(stats.inReviewCount)}
        hint={inReviewHint}
        tone={stats.inReviewCount > 0 ? "warning" : "neutral"}
      />
      <StatTile
        label="Missing"
        icon={CircleAlert}
        value={String(stats.missingCount)}
        hint={missingHint}
        tone={stats.missingCount > 0 ? "danger" : "neutral"}
      />
    </section>
  );
}
