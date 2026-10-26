import { Flame, ShieldCheck, Sparkles, Trophy } from "lucide-react";

import { XpBar } from "@/components/student/xp-bar";
import type { XpEvent } from "@/lib/gamification/engagement";
import { streakSummary, type LevelProgress, type StreakInfo } from "@/lib/gamification/rules";
import { cn } from "@/lib/utils";

/**
 * The slim strip at the top of the student Home: greeting, study streak,
 * level and XP progress, and recent XP. Engagement only, and it says so: XP
 * never changes a grade.
 */
export function StudyHeader({
  firstName,
  summary,
  streak,
  level,
  recent,
}: {
  firstName: string;
  summary: string;
  streak: StreakInfo;
  level: LevelProgress;
  recent: XpEvent[];
}) {
  const streakText = streakSummary(streak);
  const hasStreak = streak.current > 0;

  return (
    <section aria-labelledby="home-heading" className="rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 md:flex-row md:items-center md:gap-6">
        <div className="min-w-0 flex-1">
          <h1 id="home-heading" className="text-[22px] leading-7 font-medium text-balance text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{summary}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:flex md:shrink-0 md:items-center md:gap-0">
          <div aria-label="Study streak" role="group" className="flex min-w-0 items-center gap-3 md:pr-6">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                hasStreak ? "bg-warning-soft text-warning-soft-foreground" : "bg-secondary text-muted-foreground",
                streak.activeToday && "animate-in duration-500 zoom-in-90 fade-in-0"
              )}
            >
              <Flame className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="tabular truncate text-sm font-medium text-foreground">{streakText.headline}</p>
              <p
                className={cn(
                  "text-xs leading-4",
                  streak.activeToday ? "font-medium text-success-soft-foreground" : "text-muted-foreground"
                )}
              >
                {streakText.detail}
              </p>
            </div>
          </div>

          <div
            aria-label="Level and XP"
            role="group"
            className="flex min-w-0 items-center gap-3 md:border-l md:border-border md:pl-6"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
              <Trophy className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 md:w-44 md:flex-none">
              <p className="tabular text-sm font-medium whitespace-nowrap text-foreground">Level {level.level}</p>
              <XpBar level={level} className="mt-1.5" />
              <p className="tabular mt-1 text-xs leading-4 text-muted-foreground md:truncate">
                {level.intoLevel} / {level.levelSize} XP to Level {level.level + 1}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border px-4 py-2.5 sm:px-5 md:flex-row md:items-center md:justify-between md:gap-6">
        {recent.length > 0 ? (
          <ul
            className="hidden min-w-0 flex-wrap items-center gap-2 md:flex md:max-h-7 md:overflow-hidden"
            aria-label="Recent XP"
          >
            {recent.map((event) => (
              <li
                key={event.id}
                className="inline-flex h-7 max-w-[16rem] items-center gap-1.5 rounded-full bg-secondary px-3 text-xs"
                title={event.label}
              >
                <span className="tabular font-semibold text-primary-soft-foreground">+{event.xp}</span>
                <span className="truncate text-muted-foreground">{event.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
            <Sparkles className="size-3.5" aria-hidden />
            Earn XP by turning in work, logging study sessions, and setting goals.
          </p>
        )}
        <p className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-success" aria-hidden />
          XP tracks effort. It never changes your grades.
        </p>
      </div>
    </section>
  );
}
