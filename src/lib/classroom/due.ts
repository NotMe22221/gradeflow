// Due-date and timestamp labels in Google Classroom's style ("Due tomorrow",
// "Due Wednesday", "Due Nov 9"). Pure: safe for server and client components.
//
// Two kinds of day, kept apart on purpose:
// - A due date is a calendar day. The assignment builder stores it at noon
//   UTC on that day (parseDateOnly), so its day is always read from its UTC
//   date: "Due Nov 9" is Nov 9 for every viewer, whatever their zone.
// - "Today" is the viewer's calendar day: `now` read in `timeZone` (the
//   viewer's zone from viewerTimeZone(); undefined means the server's zone).
//
// Every relative label, the Upcoming lists, the To-do weeks, and the single
// past-due rule (isPastDueDay: Missing, overdue, waiting for scan) compare
// these two days through daysUntil(), so they always agree.

import { formatDate, formatDueDate, formatRelative } from "@/lib/format";

const DAY_MS = 24 * 60 * 60 * 1000;

const dueWeekdayLong = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" });
const dueWeekdayShort = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Work due within this many days counts as "due soon" (Upcoming lists). */
export const DUE_SOON_DAYS = 14;

const zonedFormatters = new Map<string, Intl.DateTimeFormat>();

function zonedFormatter(timeZone: string | undefined): Intl.DateTimeFormat {
  const key = timeZone ?? "";
  let cached = zonedFormatters.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      timeZone,
    });
    zonedFormatters.set(key, cached);
  }
  return cached;
}

function zonedParts(at: Date, timeZone: string | undefined) {
  const parts: Record<string, string> = {};
  for (const part of zonedFormatter(timeZone).formatToParts(at)) parts[part.type] = part.value;
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), weekday: parts.weekday };
}

/** The calendar day of a due date (its UTC date), as a day number. */
function dueDayNumber(due: Date): number {
  return Math.floor(due.getTime() / DAY_MS);
}

/** The calendar day `at` falls on in `timeZone` (default: the server's zone), as a day number. */
export function zonedDayNumber(at: Date, timeZone?: string): number {
  const { year, month, day } = zonedParts(at, timeZone);
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

/** Day of the week of `now` in `timeZone`: 0 Sunday to 6 Saturday (for Sunday-to-Saturday weeks). */
export function weekdayIndex(now: Date, timeZone?: string): number {
  return WEEKDAYS.indexOf(zonedParts(now, timeZone).weekday);
}

/** Whole calendar days from the viewer's today to the due day: 0 today, 1 tomorrow, -1 yesterday. */
export function daysUntil(due: Date, now: Date, timeZone?: string): number {
  return dueDayNumber(due) - zonedDayNumber(now, timeZone);
}

/**
 * The one past-due rule: work is past due once the viewer's today is after
 * its due day (it is never past due on the due day itself). Labels, Missing
 * (gradebook, assignment page, student To-do), overdue, and waiting-for-scan
 * all use it.
 */
export function isPastDueDay(
  dueDate: Date | string | null | undefined,
  now: Date = new Date(),
  timeZone?: string
): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  return !Number.isNaN(due.getTime()) && daysUntil(due, now, timeZone) < 0;
}

/**
 * "Due today", "Due tomorrow", "Due Wednesday" (or "Due Wed" with
 * style "short") within the coming week, then "Due Nov 9".
 */
export function dueLabel(
  due: Date,
  now: Date,
  { style = "long", timeZone }: { style?: "short" | "long"; timeZone?: string } = {}
): string {
  const days = daysUntil(due, now, timeZone);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1 && days < 7) return `Due ${(style === "short" ? dueWeekdayShort : dueWeekdayLong).format(due)}`;
  return `Due ${formatDueDate(due)}`;
}

// formatRelative rounds to the nearest hour, so stop just short of "24h ago".
const STREAM_RELATIVE_MS = 23.5 * 60 * 60 * 1000;
// Allow for a little clock skew between a row's timestamp and the page's `now`.
const STREAM_SKEW_MS = 60 * 1000;

/**
 * Stream timestamps: relative within the last day ("just now", "25m ago",
 * "3h ago"), else the date in the viewer's zone ("Oct 20"). Never a bare
 * clock time, which would be the server's clock for a remote viewer.
 */
export function streamTime(at: Date, now: Date, timeZone?: string): string {
  const ageMs = now.getTime() - at.getTime();
  return ageMs > -STREAM_SKEW_MS && ageMs < STREAM_RELATIVE_MS ? formatRelative(at, now) : formatDate(at, timeZone);
}

/**
 * Work due today or within `days`, soonest first (ties by title), at most
 * `limit` items. Items without a due date or already past due are left out.
 */
export function upcomingWork<T extends { title: string; dueDate: Date | null }>(
  items: T[],
  now: Date,
  { days = DUE_SOON_DAYS, limit = Infinity, timeZone }: { days?: number; limit?: number; timeZone?: string } = {}
): (T & { dueDate: Date })[] {
  return items
    .filter((item): item is T & { dueDate: Date } => {
      if (!item.dueDate) return false;
      const until = daysUntil(item.dueDate, now, timeZone);
      return until >= 0 && until <= days;
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime() || a.title.localeCompare(b.title))
    .slice(0, limit);
}
