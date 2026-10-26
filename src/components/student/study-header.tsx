import { Check, Flame, ShieldCheck, Trophy } from "@/components/icons";

import { calmStreak } from "@/components/student/streak-text";
import { XpBar } from "@/components/student/xp-bar";
import type { XpEvent } from "@/lib/gamification/engagement";
import type { LevelProgress, StreakInfo } from "@/lib/gamification/rules";

export { calmStreak };

/**
 * The student's study streak and level as one quiet card (the Home
 * "progress" section): neutral icons, no warning or danger colors, a thin XP
 * bar, and a reminder that XP never touches a grade. Its layout follows its
 * own width (container queries), so it fits the main or the side column.
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
    <div className="@container/progress rounded-xl border border-border bg-card">
      <div className="grid grid-cols-1 divide-y divide-border @min-[34rem]/progress:grid-cols-2 @min-[34rem]/progress:divide-x @min-[34rem]/progress:divide-y-0">
        <div role="group" aria-label="Study streak" className="flex min-w-0 items-center gap-3 px-4 py-4 @min-[34rem]/progress:px-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
            <Flame className="size-5" filled={streak.activeToday} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="tabular text-[0.9375rem] leading-6 font-medium text-foreground">{text.headline}</p>
            <p className="flex items-start gap-1 text-[0.8125rem] leading-5 text-pretty text-muted-foreground">
              {streak.activeToday ? <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : null}
              {text.detail}
            </p>
          </div>
        </div>

        <div role="group" aria-label="Level and XP" className="flex min-w-0 items-center gap-3 px-4 py-4 @min-[34rem]/progress:px-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
            <Trophy className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="tabular text-[0.9375rem] leading-6 font-medium text-foreground">Level {level.level}</p>
              <p className="tabular text-[0.8125rem] leading-5 text-muted-foreground">
                {level.intoLevel} / {level.levelSize} XP to level {level.level + 1}
              </p>
            </div>
            <XpBar level={level} className="mt-2" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 border-t border-border px-4 py-2.5 @min-[34rem]/progress:px-5 @min-[48rem]/progress:flex-row @min-[48rem]/progress:items-center @min-[48rem]/progress:justify-between @min-[48rem]/progress:gap-6">
        <p className="min-w-0 truncate text-[0.8125rem] leading-5 text-muted-foreground">
          {latest ? (
            <>
              Latest: <span className="tabular font-medium text-foreground">+{latest.xp} XP</span> · {latest.label}
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

