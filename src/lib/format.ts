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

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "–";
  return dateFormatter.format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "–";
  return dateTimeFormatter.format(new Date(date));
}

export function formatRelative(date: Date | string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(date).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}
