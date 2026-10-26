import { Flame, Trophy, type LucideIcon } from "lucide-react";

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
      {/*
        Each group is a div holding only its dt and dd elements, as the HTML
        spec requires inside a dl. The decorative icon lives in the dt,
        positioned into the left gutter (2.5rem icon + 0.875rem gap).
      */}
      <dl className="space-y-5 border-t border-border px-5 py-5 sm:px-6">
        <div className="relative min-h-10 min-w-0 pl-[3.375rem]">
          <dt className="text-[13px] text-muted-foreground">
            <EngagementIcon icon={Flame} />
            Study streak
          </dt>
          <dd className="tabular font-display text-lg leading-7 font-medium text-foreground">
            {pluralize(streak.current, "day")}
          </dd>
          <dd className="tabular text-xs leading-5 text-muted-foreground">
            {streakNote} Longest {pluralize(streak.longest, "day")}.
          </dd>
        </div>
        <div className="relative min-h-10 min-w-0 pl-[3.375rem]">
          <dt className="text-[13px] text-muted-foreground">
            <EngagementIcon icon={Trophy} />
            Level
          </dt>
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
      </dl>
    </Card>
  );
}

function EngagementIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span
      aria-hidden
      className="absolute top-0 left-0 flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground"
    >
      <Icon className="size-5" />
    </span>
  );
}
