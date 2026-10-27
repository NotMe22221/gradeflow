import { Check, Flame, ShieldCheck, Trophy } from "@/components/icons";

import { calmStreak } from "@/components/student/streak-text";
import { XpBar } from "@/components/student/xp-bar";
import type { XpEvent } from "@/lib/gamification/engagement";
import type { LevelProgress, StreakInfo } from "@/lib/gamification/rules";
import { cn } from "@/lib/utils";

export { calmStreak };

/** A tile on a band: big type in the band's ink (never muted or accent text on a band). */
const TILE =
  "flex min-w-0 items-center gap-4 rounded-3xl px-5 py-5 text-band-foreground @min-[34rem]/progress:px-6 @min-[34rem]/progress:py-6";

/** The icon on a card-colored sticker with an organic outline, like the paint blobs. */
const STICKER = "flex size-14 shrink-0 items-center justify-center bg-card text-card-foreground";

/**
 * The student's study streak and level as two bold tiles (the Home
 * "progress" section): the streak on coral, the level on mint, big display
 * numbers and a chunky XP bar, then one line on the canvas: the latest XP
 * and a reminder that XP never touches a grade. The streak stays calm: no
 * warning or danger colors, and a lost streak reads "Streak ended". Bands
 * turn plain in the Calm look. Its layout follows its own width (container
 * queries), so it fits the main or the side column.
 */
export function StudyProgress({
  streak,
  level,
  recent,
}: {
  streak: StreakInfo;
  level: LevelProgress;
  recent: XpEvent[];
}) {
  const text = calmStreak(streak);
  const latest = recent[0];
  return (
    <div className="@container/progress">
      <div className="grid grid-cols-1 gap-3 @min-[34rem]/progress:grid-cols-2">
        <div role="group" aria-label="Study streak" className={cn(TILE, "bg-band-coral")}>
          <span className={cn(STICKER, "rounded-[58%_42%_55%_45%/48%_56%_44%_52%]")}>
            <Flame className="size-7" filled={streak.activeToday} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="tabular font-display text-[1.5rem] leading-tight font-extrabold tracking-[-0.02em] text-balance @min-[34rem]/progress:text-[1.75rem]">
              {text.headline}
            </p>
            <p className="mt-1 flex items-start gap-1 text-[0.875rem] leading-5 font-medium text-pretty">
              {streak.activeToday ? <Check className="mt-0.5 size-4 shrink-0" strokeWidth={3} aria-hidden /> : null}
              {text.detail}
            </p>
          </div>
        </div>

        <div role="group" aria-label="Level and XP" className={cn(TILE, "bg-band-mint")}>
          <span className={cn(STICKER, "rounded-[44%_56%_46%_54%/56%_44%_56%_44%]")}>
            <Trophy className="size-7" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="tabular font-display text-[1.5rem] leading-tight font-extrabold tracking-[-0.02em] @min-[34rem]/progress:text-[1.75rem]">
                Level {level.level}
              </p>
              <p className="tabular text-[0.875rem] leading-5 font-medium">
                {level.intoLevel} / {level.levelSize} XP to level {level.level + 1}
              </p>
            </div>
            <XpBar level={level} className="mt-3" />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1 px-1 @min-[48rem]/progress:flex-row @min-[48rem]/progress:items-center @min-[48rem]/progress:justify-between @min-[48rem]/progress:gap-6">
        <p className="min-w-0 truncate text-[0.8125rem] leading-5 text-muted-foreground">
          {latest ? (
            <>
              Latest: <span className="tabular font-semibold text-foreground">+{latest.xp} XP</span> · {latest.label}
            </>
          ) : (
            "Earn XP by turning in work, logging study sessions, and setting goals."
          )}
        </p>
        <p className="flex shrink-0 items-center gap-1.5 text-[0.8125rem] leading-5 text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden />
          XP tracks effort. It never changes your grades.
        </p>
      </div>
    </div>
  );
}
