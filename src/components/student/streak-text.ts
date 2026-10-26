// Calm streak words for the student's progress card. Pure: safe for server
// and client components and unit tests.

import { pluralize } from "@/lib/format";
import { streakSummary, type StreakInfo } from "@/lib/gamification/rules";

/**
 * A missed day is never an alarm: a lost streak reads "Streak ended" in the
 * same neutral color as any other state, with the best run so far and a
 * fresh start.
 */
export function calmStreak(streak: StreakInfo): { headline: string; detail: string } {
  const { headline } = streakSummary(streak);
  if (streak.current > 0) {
    return { headline, detail: streak.activeToday ? "Studied today" : "Study today to keep it going" };
  }
  if (streak.longest > 0) {
    return { headline, detail: `Best so far: ${pluralize(streak.longest, "day")}. Start a new one today.` };
  }
  return { headline, detail: "Log a study session to start one" };
}
