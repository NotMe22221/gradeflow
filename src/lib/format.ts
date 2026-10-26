/** Formatting helpers shared by server and client components. */

export function formatPoints(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatScore(score: number | null | undefined, max: number): string {
  return `${formatPoints(score)}/${formatPoints(max)}`;
}

export function formatPercent(score: number, max: number): string {
  if (max <= 0) return "–";
  return `${Math.round((score / max) * 100)}%`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

// Timestamps (posted, turned in, returned) print in the viewer's time zone
// when the caller passes it (viewerTimeZone() on the server), else in the
// server's zone. Due dates are calendar days stored at noon UTC, so they print
// from their UTC date (formatDueDate) and read as the same day everywhere.

const formatters = new Map<string, Intl.DateTimeFormat>();
/** Cap on cached formatters, so no input can grow the cache without limit. */
const MAX_FORMATTERS = 64;

function formatter(kind: "date" | "dateTime", timeZone: string | undefined): Intl.DateTimeFormat {
  const key = `${kind}:${timeZone ?? ""}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      ...(kind === "dateTime" ? { hour: "numeric", minute: "2-digit" } : {}),
      timeZone,
    });
    if (formatters.size >= MAX_FORMATTERS) formatters.delete(formatters.keys().next().value!);
    formatters.set(key, cached);
  }
  return cached;
}

/** "Oct 26" for a moment in time, in `timeZone` (default: the server's zone). */
export function formatDate(date: Date | string | null | undefined, timeZone?: string): string {
  if (!date) return "–";
  return formatter("date", timeZone).format(new Date(date));
}

/** "Oct 26, 7:45 PM" for a moment in time, in `timeZone` (default: the server's zone). */
export function formatDateTime(date: Date | string | null | undefined, timeZone?: string): string {
  if (!date) return "–";
  return formatter("dateTime", timeZone).format(new Date(date));
}

/** "Nov 9" for a due date: its calendar day (the UTC date it is stored on), the same in every zone. */
export function formatDueDate(date: Date | string | null | undefined): string {
  if (!date) return "–";
  return formatter("date", "UTC").format(new Date(date));
}

export function formatRelative(date: Date | string, now: Date = new Date(), timeZone?: string): string {
  const diffMs = now.getTime() - new Date(date).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date, timeZone);
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}
