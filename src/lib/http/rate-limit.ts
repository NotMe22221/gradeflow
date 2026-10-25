import "server-only";

/**
 * A small in-memory, per-user rate limit for the routes that call a paid AI
 * API. It only applies when a real key is configured: the local demo engines
 * cost nothing. In-memory is enough for a single-process hackathon demo; a
 * deployment would move this to a shared store.
 */

type Window = { start: number; count: number };

const windows = new Map<string, Window>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function checkRateLimit(
  key: string,
  { limit, windowMs, now = Date.now() }: { limit: number; windowMs: number; now?: number }
): RateLimitResult {
  const current = windows.get(key);
  if (!current || now - current.start >= windowMs) {
    windows.set(key, { start: now, count: 1 });
    return { ok: true };
  }
  if (current.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((current.start + windowMs - now) / 1000)) };
  }
  current.count += 1;
  return { ok: true };
}

/** Budgets per user for live AI calls. Generous for a demo, tight enough to stop a runaway loop. */
export const AI_RATE_LIMITS = {
  vision: { limit: 30, windowMs: 10 * 60 * 1000 },
  text: { limit: 60, windowMs: 10 * 60 * 1000 },
} as const;

export function rateLimitMessage(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Too many AI requests in a short time. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
