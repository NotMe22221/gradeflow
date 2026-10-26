import type { LevelProgress } from "@/lib/gamification/rules";
import { cn } from "@/lib/utils";

import styles from "./xp-bar.module.css";

/**
 * Progress inside the current level: a thin, quiet bar (the numbers sit
 * beside it in words), with a short fill on load that reduced motion skips.
 */
export function XpBar({ level, className }: { level: LevelProgress; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-label={`XP toward level ${level.level + 1}`}
      aria-valuemin={0}
      aria-valuemax={level.levelSize}
      aria-valuenow={level.intoLevel}
      aria-valuetext={`${level.intoLevel} of ${level.levelSize} XP`}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-secondary", className)}
    >
      <div
        className={cn("h-full rounded-full bg-primary", level.percent > 0 && styles.fill)}
        style={{ width: `${Math.max(0, Math.min(100, level.percent))}%` }}
      />
    </div>
  );
}
