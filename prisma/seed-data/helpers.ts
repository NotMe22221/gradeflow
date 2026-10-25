// Small helpers for the demo seed. Pure: no database access.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Join paragraphs the way a pasted paper arrives: blank line between paragraphs. */
export function paper(...paragraphs: string[]): string {
  return paragraphs.map((paragraph) => paragraph.trim()).join("\n\n");
}

/** "Ava Quillon" -> "ava.quillon@students.gradeflow.example" */
export function studentEmail(name: string): string {
  const local = name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.replace(/[^a-z]/g, ""))
    .join(".");
  return `${local}@students.gradeflow.example`;
}

/** A local clock time some whole number of days before the seed runs. */
export type DaysAgoAt = { daysAgo: number; hour: number; minute: number };

/**
 * Timestamps relative to the moment the seed runs, so the demo always looks
 * current: "submitted 2 days ago at 10:31 PM", "due in 3 days".
 */
export function createClock(now: Date = new Date()) {
  return {
    now,

    /**
     * A readable local clock time on a past day. With daysAgo >= 1 the
     * result is always in the past, whatever time of day the seed runs.
     */
    at({ daysAgo, hour, minute }: DaysAgoAt): Date {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(hour, minute, 0, 0);
      return date;
    },

    /**
     * A due date as the assignment builder stores it: noon UTC on the
     * calendar day, so it shows as the same day in every time zone.
     * Negative values are in the past.
     */
    dueInDays(days: number): Date {
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
      return new Date(today.getTime() + days * DAY_MS);
    },

    /** An exact offset from now, for "a moment later" timestamps. */
    plusSeconds(date: Date, seconds: number): Date {
      return new Date(date.getTime() + seconds * 1000);
    },
  };
}

export type Clock = ReturnType<typeof createClock>;

export function sum(values: number[]): number {
  return Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;
}
