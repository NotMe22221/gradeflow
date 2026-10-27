import type { LevelProgress } from "@/lib/gamification/rules";
import { cn } from "@/lib/utils";

import styles from "./xp-bar.module.css";

/**
 * Progress inside the current level: a chunky pill (the numbers sit beside
 * it in words). The track is the card color, so it reads on a band or the
 * canvas; the fill is accent Liquid Glass (a solid accent fill when
 * transparency is reduced), with a short fill on load that reduced motion
 * skips.
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
      className={cn("h-3.5 w-full overflow-hidden rounded-full bg-card p-0.5", className)}
    >
      <div
        className={cn("liquid h-full rounded-full", level.percent > 0 && ["min-w-2.5", styles.fill])}
        style={{ width: `${Math.max(0, Math.min(100, level.percent))}%` }}
      />
    </div>
  );
}
