// Due-date and timestamp labels in Google Classroom's style ("Due tomorrow",
// "Due Wednesday", "Due Nov 9"). Pure: safe for server and client components.
//
// Due dates are stored at noon UTC on their calendar day (parseDateOnly), so
// the local calendar day is the same day in every time zone from UTC-11 to
// UTC+11. Days are compared as local calendar days, the same way formatDate()
// prints them.

const DAY_MS = 24 * 60 * 60 * 1000;

const weekdayLong = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const weekdayShort = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const timeOfDay = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

/** Work due within this many days counts as "due soon" (Upcoming lists). */
export const DUE_SOON_DAYS = 14;

function dayNumber(date: Date): number {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

/** Whole calendar days from `now` to `due`: 0 today, 1 tomorrow, -1 yesterday. */
export function daysUntil(due: Date, now: Date): number {
  return dayNumber(due) - dayNumber(now);
}

/**
 * "Due today", "Due tomorrow", "Due Wednesday" (or "Due Wed" with
 * style "short") within the coming week, then "Due Nov 9".
 */
export function dueLabel(due: Date, now: Date, style: "short" | "long" = "long"): string {
  const days = daysUntil(due, now);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1 && days < 7) return `Due ${(style === "short" ? weekdayShort : weekdayLong).format(due)}`;
  return `Due ${monthDay.format(due)}`;
}

/** Stream timestamps: the time for today ("7:45 AM"), else the date ("Oct 20"). */
export function streamTime(at: Date, now: Date): string {
  return daysUntil(at, now) === 0 ? timeOfDay.format(at) : monthDay.format(at);
}

/**
 * Work due today or within `days`, soonest first (ties by title), at most
 * `limit` items. Items without a due date or already past due are left out.
 */
export function upcomingWork<T extends { title: string; dueDate: Date | null }>(
  items: T[],
  now: Date,
  { days = DUE_SOON_DAYS, limit = Infinity }: { days?: number; limit?: number } = {}
): (T & { dueDate: Date })[] {
  return items
    .filter((item): item is T & { dueDate: Date } => {
      if (!item.dueDate) return false;
      const until = daysUntil(item.dueDate, now);
      return until >= 0 && until <= days;
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime() || a.title.localeCompare(b.title))
    .slice(0, limit);
}
