import { Flame, Trophy } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>
          <h2>
            Engagement <span className="font-normal text-muted-foreground">(XP is not part of the grade)</span>
          </h2>
        </CardTitle>
      </CardHeader>
      <dl className="space-y-5 px-6 pb-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground ring-1 ring-border">
            <Flame className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Study streak</dt>
            <dd className="tabular text-base font-semibold text-foreground">{pluralize(streak.current, "day")}</dd>
            <dd className="tabular text-xs text-muted-foreground">
              {streakNote} Longest {pluralize(streak.longest, "day")}.
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground ring-1 ring-border">
            <Trophy className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <dt className="text-xs text-muted-foreground">Level</dt>
            <dd className="tabular flex items-baseline justify-between gap-3">
              <span className="text-base font-semibold text-foreground">Level {level.level}</span>
              <span className="text-xs text-muted-foreground">{level.xp.toLocaleString("en-US")} XP total</span>
            </dd>
            <dd className="mt-2">
              <div
                role="progressbar"
                aria-label={`Progress to level ${level.level + 1}`}
                aria-valuemin={0}
                aria-valuemax={level.levelSize}
                aria-valuenow={level.intoLevel}
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full rounded-full bg-muted-foreground/70" style={{ width: `${level.percent}%` }} />
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
