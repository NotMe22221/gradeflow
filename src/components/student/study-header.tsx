import { Flame, ShieldCheck, Sparkles, Trophy } from "lucide-react";

import { XpBar } from "@/components/student/xp-bar";
import { Card } from "@/components/ui/card";
import type { XpEvent } from "@/lib/gamification/engagement";
import { streakSummary, type LevelProgress, type StreakInfo } from "@/lib/gamification/rules";
import { cn } from "@/lib/utils";

/**
 * The top of the student dashboard: greeting, study streak, level, XP
 * progress, and recent XP. Engagement only, and it says so: XP never changes
 * a grade.
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
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[13px] font-medium text-muted-foreground">Student dashboard</p>
          <h1 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
            Welcome back, {firstName}.
          </h1>
          <p className="max-w-xl text-sm text-pretty text-muted-foreground">{summary}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:w-[32rem] lg:shrink-0">
          <section aria-label="Study streak" className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-4">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full ring-1",
                hasStreak
                  ? "bg-warning-soft text-warning-soft-foreground ring-warning/30"
                  : "bg-secondary text-muted-foreground ring-border",
                streak.activeToday && "animate-in duration-500 zoom-in-90 fade-in-0"
              )}
            >
              <Flame className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="tabular text-base font-semibold text-foreground">{streakText.headline}</p>
              <p
                className={cn(
                  "text-xs",
                  streak.activeToday ? "font-medium text-success-soft-foreground" : "text-muted-foreground"
                )}
              >
                {streakText.detail}
              </p>
            </div>
          </section>

          <section aria-label="Level and XP" className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground ring-1 ring-primary/15">
              <Trophy className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              {/* Level, bar, then XP on its own line: side by side they don't fit the half-width card on laptops. */}
              <p className="tabular text-base font-semibold whitespace-nowrap text-foreground">Level {level.level}</p>
              <XpBar level={level} className="mt-2" />
              <p className="tabular mt-1.5 text-xs text-muted-foreground">
                {level.intoLevel} / {level.levelSize} XP to Level {level.level + 1}
              </p>
            </div>
          </section>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border bg-muted/40 px-5 py-3 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-6">
        {recent.length > 0 ? (
          <ul className="hidden min-w-0 flex-wrap items-center gap-2 md:flex md:max-h-7 md:overflow-hidden" aria-label="Recent XP">
            {recent.map((event) => (
              <li
                key={event.id}
                className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs shadow-card"
                title={event.label}
              >
                <span className="tabular font-semibold text-foreground">+{event.xp}</span>
                <span className="truncate text-muted-foreground">{event.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
            <Sparkles className="size-3.5" aria-hidden />
            Earn XP by submitting work, logging study sessions, and setting goals.
          </p>
        )}
        <p className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-success" aria-hidden />
          XP tracks effort. It never changes your grades.
        </p>
      </div>
    </Card>
  );
}
