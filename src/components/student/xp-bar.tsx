import type { LevelProgress } from "@/lib/gamification/rules";
import { cn } from "@/lib/utils";

import styles from "./xp-bar.module.css";

/** Progress inside the current level, with a subtle fill animation on load. */
export function XpBar({ level, className }: { level: LevelProgress; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-label={`XP toward level ${level.level + 1}`}
      aria-valuemin={0}
      aria-valuemax={level.levelSize}
      aria-valuenow={level.intoLevel}
      aria-valuetext={`${level.intoLevel} of ${level.levelSize} XP`}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted ring-1 ring-border/60 ring-inset", className)}
    >
      <div
        className={cn("h-full rounded-full bg-primary", level.percent > 0 && styles.fill)}
        style={{ width: `${Math.max(0, Math.min(100, level.percent))}%` }}
      />
    </div>
  );
}
