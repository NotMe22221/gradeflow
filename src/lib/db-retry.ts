// When to retry a database transaction. Pure: safe for unit tests.
//
// Transactions run at SERIALIZABLE isolation (see transaction() in db.ts), the
// same guarantee SQLite gave this app: concurrent read-then-write steps (an
// approval and a second approval, two XP awards on the same day) behave as if
// they ran one after another. Postgres enforces that by aborting one of two
// conflicting transactions; the aborted one is safe to run again.

/** Postgres serialization failure and deadlock SQLSTATEs. */
const RETRYABLE_SQLSTATES = new Set(["40001", "40P01"]);

/** Prisma's code for "transaction failed due to a write conflict or a deadlock". */
const RETRYABLE_PRISMA_CODES = new Set(["P2034"]);

export function isRetryableConflict(error: unknown): boolean {
  for (let current = error, depth = 0; current && typeof current === "object" && depth < 5; depth++) {
    const record = current as { code?: unknown; cause?: unknown; meta?: { code?: unknown } };
    if (typeof record.code === "string" && (RETRYABLE_PRISMA_CODES.has(record.code) || RETRYABLE_SQLSTATES.has(record.code))) {
      return true;
    }
    if (typeof record.meta?.code === "string" && RETRYABLE_SQLSTATES.has(record.meta.code)) return true;
    current = record.cause;
  }
  return false;
}

/** Wait before retry `attempt` (1-based): about 30, 60, 120 ms, with jitter so retries don't collide again. */
export function retryDelayMs(attempt: number, random: number): number {
  return Math.round(15 * 2 ** attempt * (0.5 + random));
}
