import { Flame, Trophy } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LevelProgress, StreakInfo } from "@/lib/gamification/rules";
import { pluralize } from "@/lib/format";

/**
 * Study streak and XP level from StudyActivity. Engagement only: XP never
 * touches a grade, and the card says so.
 */
export function EngagementCard({ streak, level }: { streak: StreakInfo; level: LevelProgress }) {
  const toNext = level.levelSize - level.intoLevel;
  const streakNote =
    streak.current === 0
      ? "No study activity in the last two days."
      : streak.activeToday
        ? "Active today."
        : "Active yesterday. Today keeps it going.";

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-1 px-5 pt-5 pb-4 sm:px-6">
        <CardTitle>
          <h2>Engagement</h2>
        </CardTitle>
        <CardDescription>Study streak and XP. XP is not part of the grade.</CardDescription>
      </CardHeader>
      <dl className="space-y-5 border-t border-border px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
            <Flame className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <dt className="text-[13px] text-muted-foreground">Study streak</dt>
            <dd className="tabular font-display text-lg leading-7 font-medium text-foreground">
              {pluralize(streak.current, "day")}
            </dd>
            <dd className="tabular text-xs leading-5 text-muted-foreground">
              {streakNote} Longest {pluralize(streak.longest, "day")}.
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
            <Trophy className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <dt className="text-[13px] text-muted-foreground">Level</dt>
            <dd className="tabular flex items-baseline justify-between gap-3">
              <span className="font-display text-lg leading-7 font-medium text-foreground">Level {level.level}</span>
              <span className="text-xs text-muted-foreground">{level.xp.toLocaleString("en-US")} XP total</span>
            </dd>
            <dd className="mt-2">
              <div
                role="progressbar"
                aria-label={`Progress to level ${level.level + 1}`}
                aria-valuemin={0}
                aria-valuemax={level.levelSize}
                aria-valuenow={level.intoLevel}
                className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
              >
                <div className="h-full rounded-full bg-primary" style={{ width: `${level.percent}%` }} />
              </div>
              <p className="tabular mt-1.5 text-xs text-muted-foreground">
                {toNext} XP to level {level.level + 1}
              </p>
            </dd>
          </div>
        </div>
      </dl>
    </Card>
  );
}
