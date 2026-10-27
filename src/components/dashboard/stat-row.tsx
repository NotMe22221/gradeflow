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

/** Each figure's tile color: a section band, so it turns plain in the Calm look. */
const TILE_BG = {
  mint: "bg-band-mint",
  sky: "bg-band-sky",
  lilac: "bg-band-lilac",
} as const;

function Stat({
  label,
  value,
  unit,
  srValue,
  tone,
  children,
}: {
  label: string;
  value: string;
  unit?: string;
  /** Spoken form of value + unit when the visual form reads poorly. */
  srValue?: string;
  tone: keyof typeof TILE_BG;
  children: React.ReactNode;
}) {
  return (
    // Narrow: label and note on the left, the number on the right. Wider: a tile per figure. Every
    // line is band-foreground: text on a band is never muted.
    <div
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-3xl px-5 py-4 text-band-foreground [grid-template-areas:'label_value'_'note_value'] @min-[36rem]:grid-cols-1 @min-[36rem]:grid-rows-[auto_auto_1fr] @min-[36rem]:items-start @min-[36rem]:px-6 @min-[36rem]:pt-5 @min-[36rem]:pb-6 @min-[36rem]:[grid-template-areas:'label'_'value'_'note']",
        TILE_BG[tone]
      )}
    >
      <h3 className="font-sans text-[0.875rem] leading-5 font-semibold [grid-area:label]">{label}</h3>
      <p className="flex items-baseline gap-1 [grid-area:value] @min-[36rem]:mt-2">
        <span
          className="tabular font-display text-[2.25rem] leading-none font-extrabold tracking-[-0.04em] @min-[36rem]:text-[3rem]"
          aria-hidden={srValue ? true : undefined}
        >
          {value}
        </span>
        {unit ? (
          <span className="text-[1rem] font-semibold" aria-hidden={srValue ? true : undefined}>
            {unit}
          </span>
        ) : null}
        {srValue ? <span className="sr-only">{srValue}</span> : null}
      </p>
      <p className="mt-0.5 text-[0.8125rem] leading-5 text-pretty [grid-area:note] @min-[36rem]:mt-2">{children}</p>
    </div>
  );
}

/**
 * Home's "This week" strip: papers approved and returned, how far approved
 * grades moved from the AI draft, and the time-saved figure, which is always
 * labelled as an illustrative estimate (never a measurement). Big figures on
 * bright tiles (mint, sky, lilac bands; plain tonal tiles in Calm); the
 * notice above them carries anything urgent.
 */
export function StatRow({ stats, className }: { stats: DashboardStats; className?: string }) {
  const diff = stats.avgAiFinalDiff;
  // Demo grader drafts are not AI output, so the stat says when they are in it.
  const allDemo = stats.avgAiFinalDiffDemo > 0 && stats.avgAiFinalDiffDemo === stats.avgAiFinalDiffSample;
  const draftLabel = allDemo ? "Demo draft vs. your grade" : "AI draft vs. your grade";
  const timeSaved = formatTimeSaved(stats.timeSavedMinutes);

  return (
    <div className={cn("grid grid-cols-1 gap-3 @min-[36rem]:grid-cols-3", className)}>
      <Stat tone="mint" label="Papers returned" value={String(stats.gradedThisWeek)}>
        Approved by you in the last 7 days
      </Stat>

      {diff === null ? (
        <Stat tone="sky" label="AI draft vs. your grade" value="–" srValue="No data yet">
          Shows after you approve a grade
        </Stat>
      ) : (
        <Stat
          tone="sky"
          label={draftLabel}
          value={`±${formatPoints(diff)}`}
          unit={diff === 1 ? "pt" : "pts"}
          srValue={`Plus or minus ${formatPoints(diff)} ${diff === 1 ? "point" : "points"} on average`}
        >
          Average change, across all {pluralize(stats.avgAiFinalDiffSample, "approved grade")} so far
          {allDemo
            ? ", all drafted by the demo grader (not AI)"
            : stats.avgAiFinalDiffDemo > 0
              ? ` (${stats.avgAiFinalDiffDemo} by the demo grader, not AI)`
              : ""}
        </Stat>
      )}

      <Stat
        tone="lilac"
        label="Time saved (estimate)"
        value={timeSaved.value}
        unit={timeSaved.unit}
        srValue={`About ${timeSaved.value.replace("~", "")} ${timeSaved.unit}, an illustrative estimate`}
      >
        Illustrative: assumes ~{ILLUSTRATIVE_MINUTES_SAVED_PER_PAPER} min saved per paper, not a measurement
      </Stat>
    </div>
  );
}
