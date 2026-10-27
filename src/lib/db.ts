import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { DATABASE_URL, poolSettings, transactionStatementTimeoutSql, USES_LOCAL_DATABASE } from "@/lib/db-url";
import { nextRetryDelayMs } from "@/lib/db-retry";

function createClient() {
  // Pool size and timeouts: see poolSettings(). On the local server that is a
  // single connection, so code inside a transaction() callback must use only
  // `tx`, never `db` (a `db` query would wait for the connection its own
  // transaction holds). pg's client-side `query_timeout` is deliberately not
  // set: when it fires inside a transaction, the adapter can hand the
  // connection back to the pool with the statement still running and the
  // transaction still open. transaction() bounds statements on the server.
  const adapter = new PrismaPg({ connectionString: DATABASE_URL, ...poolSettings(DATABASE_URL, USES_LOCAL_DATABASE) });
  return new PrismaClient({ adapter });
}

// One client (one pool) per server process: reused across hot reloads in
// development, and shared in production by the separately bundled pages and
// route handlers, which each evaluate this module and would otherwise open a
// pool each (on the local server, two pools could use all its connections).
// Because the client may come from the other bundle, recognise Prisma errors
// by `error.code` (as db-retry.ts does), never `instanceof Prisma.*`, and
// don't pass it values built with another bundle's `Prisma` namespace
// (Prisma.sql, Prisma.DbNull, Prisma.Decimal).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = (globalForPrisma.prisma ??= createClient());

/**
 * Run `fn` in one SERIALIZABLE transaction, retrying when Postgres aborts it
 * because a concurrent transaction conflicted (on a statement or at COMMIT;
 * see isRetryableConflict and RETRY_POLICY in db-retry.ts: up to 10
 * attempts, no retry later than 4 s after the first began). Every
 * read-then-write step in the app (claiming a paper, approving and
 * publishing, saving a grade) goes through here, so concurrent requests can't
 * both pass the same check. (XP is the exception: it is made once-only by
 * each row's key, see gamification/award.ts.) `fn` must only touch the database through `tx`:
 * it may run more than once.
 *
 * `maxWait` bounds the wait for a connection, `timeout` the transaction once
 * started, and every statement in it is cancelled by Postgres after `timeout`
 * too (a lock wait included), so a stuck statement can't hold the request
 * until the function's maxDuration.
 */
export async function transaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  { maxWait = 5_000, timeout = 15_000 }: { maxWait?: number; timeout?: number } = {}
): Promise<T> {
  const statementTimeout = transactionStatementTimeoutSql(timeout);
  const startedAt = Date.now();
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          await tx.$executeRawUnsafe(statementTimeout);
          return fn(tx);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait, timeout }
      );
    } catch (error) {
      const delay = nextRetryDelayMs(error, attempt, Date.now() - startedAt, Math.random());
      if (delay === null) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
