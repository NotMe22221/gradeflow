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

/** The driver adapter's error kind for 40001 / 40P01 (@prisma/adapter-pg's convertDriverError). */
const RETRYABLE_ADAPTER_KINDS = new Set(["TransactionWriteConflict"]);

/**
 * True when Postgres aborted the transaction because a concurrent one
 * conflicted (serialization failure or deadlock), so running it again is safe.
 * The conflict arrives in one of two shapes:
 * - on a statement: PrismaClientKnownRequestError P2034 (meta.code "40001");
 * - at COMMIT, the usual place SERIALIZABLE reports write skew: Prisma 7
 *   rethrows the adapter's own error, `DriverAdapterError` whose `cause` is
 *   `{ kind: "TransactionWriteConflict", originalCode: "40001" }`, with no
 *   Prisma code. Postgres has rolled that transaction back.
 * Everything else is final. In particular a connection lost during COMMIT
 * (adapter kinds ConnectionClosed, SocketTimeout, ...) is never retried: the
 * transaction may have committed, and running it again could apply it twice.
 */
export function isRetryableConflict(error: unknown): boolean {
  for (let current = error, depth = 0; current && typeof current === "object" && depth < 5; depth++) {
    const record = current as {
      code?: unknown;
      cause?: unknown;
      meta?: { code?: unknown };
      kind?: unknown;
      originalCode?: unknown;
    };
    if (typeof record.code === "string" && (RETRYABLE_PRISMA_CODES.has(record.code) || RETRYABLE_SQLSTATES.has(record.code))) {
      return true;
    }
    if (typeof record.meta?.code === "string" && RETRYABLE_SQLSTATES.has(record.meta.code)) return true;
    if (typeof record.kind === "string" && RETRYABLE_ADAPTER_KINDS.has(record.kind)) return true;
    if (typeof record.originalCode === "string" && RETRYABLE_SQLSTATES.has(record.originalCode)) return true;
    current = record.cause;
  }
  return false;
}

/**
 * How transaction() retries conflicts. A burst of requests that touch nearby
 * rows (SERIALIZABLE locks whole index pages, so "nearby" is enough) can
 * abort each other several times in a row: 30 such transactions at once
 * needed up to 7 attempts on Postgres 16. So it allows 10, spread out by a
 * jittered exponential backoff. The time budget keeps the whole thing well
 * inside a route's maxDuration (/api/grade leaves about 10 s after its AI
 * call): no retry starts once `budgetMs` has passed since the first attempt
 * began, however many attempts are left.
 */
export const RETRY_POLICY = {
  /** Attempts in all, the first one included. */
  attempts: 10,
  /** No retry starts later than this after the first attempt began. */
  budgetMs: 4_000,
  /** The wait before the first retry, before jitter; it doubles for each later one. */
  baseDelayMs: 20,
  /** The longest wait before jitter. */
  maxDelayMs: 500,
} as const;

/**
 * Wait before retry `attempt` (1-based: the wait after the first failed
 * attempt), with `random` in [0, 1): about 20, 40, 80, ... ms, at most
 * 500 ms, each scaled by 0.5-1.5 so transactions that collided once don't
 * collide again.
 */
export function retryDelayMs(attempt: number, random: number): number {
  const ceiling = Math.min(RETRY_POLICY.maxDelayMs, RETRY_POLICY.baseDelayMs * 2 ** Math.max(0, attempt - 1));
  return Math.round(ceiling * (0.5 + random));
}

/**
 * After attempt `attempt` (1-based) failed with `error`, `elapsedMs` after the
 * first attempt began: how long to wait before the next attempt, or null to
 * give up and rethrow (not a conflict, out of attempts, or out of time).
 */
export function nextRetryDelayMs(error: unknown, attempt: number, elapsedMs: number, random: number): number | null {
  if (attempt >= RETRY_POLICY.attempts || !isRetryableConflict(error)) return null;
  const delay = retryDelayMs(attempt, random);
  return elapsedMs + delay <= RETRY_POLICY.budgetMs ? delay : null;
}
