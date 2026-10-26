import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { DATABASE_URL } from "@/lib/db-url";
import { isRetryableConflict, retryDelayMs } from "@/lib/db-retry";

function createClient() {
  // A small pool per server instance: serverless hosts run many instances,
  // and the host's pooler (e.g. Neon's) multiplexes them.
  const adapter = new PrismaPg({ connectionString: DATABASE_URL, max: 5 });
  return new PrismaClient({ adapter });
}

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

const ATTEMPTS = 4;

/**
 * Run `fn` in one SERIALIZABLE transaction, retrying when Postgres aborts it
 * because a concurrent transaction conflicted. Every read-then-write step in
 * the app (claiming a paper, approving and publishing, awarding XP) goes
 * through here, so concurrent requests can't both pass the same check. `fn`
 * must only touch the database: it may run more than once.
 */
export async function transaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  { maxWait = 5_000, timeout = 15_000 }: { maxWait?: number; timeout?: number } = {}
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait,
        timeout,
      });
    } catch (error) {
      if (attempt >= ATTEMPTS || !isRetryableConflict(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt, Math.random())));
    }
  }
}
