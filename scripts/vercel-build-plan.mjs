// Pure helpers for scripts/vercel-build.mjs: no side effects on import, so the
// unit tests (tests/build-scripts-vercel-build.test.ts) can load them.

/** Values of ALLOW_PREVIEW_DB_CHANGES that turn it on. */
const YES = new Set(["1", "true", "yes"]);

/**
 * Whether this build may change the database: push the schema and seed it if
 * it is empty (never erasing anything).
 *
 * - Vercel Production builds: yes.
 * - Every other Vercel build (Preview, Development, or no VERCEL_ENV): only
 *   with ALLOW_PREVIEW_DB_CHANGES=1. Unless Neon gives each preview its own
 *   database branch, previews share the production database, and a preview
 *   of a branch that changes the schema would change production's (and drop
 *   columns production still reads).
 * - Off Vercel (`npm run vercel-build` on a computer or another CI): yes, as
 *   before; the database is whatever DATABASE_URL names, or the local server.
 */
export function vercelBuildPlan(env) {
  const onVercel = Boolean(env.VERCEL?.trim());
  const environment = onVercel ? env.VERCEL_ENV?.trim().toLowerCase() || "unknown" : "local";
  const optIn = YES.has((env.ALLOW_PREVIEW_DB_CHANGES ?? "").trim().toLowerCase());
  if (environment === "local" || environment === "production") return { environment, changeDatabase: true, optIn: false };
  return { environment, changeDatabase: optIn, optIn };
}

/** The first set variable among `names`, ignoring an old SQLite "file:" setting (as src/lib/db-url.ts does). */
function first(env, names) {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value && !value.startsWith("file:")) return value;
  }
  return undefined;
}

/** "host:port/database" for logs: never the user name or password. */
export function describeDatabase(url) {
  try {
    const parsed = new URL(url);
    const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    return `${parsed.host}${database ? `/${database}` : ""}`;
  } catch {
    return "(an unreadable connection string)";
  }
}

/**
 * The database that schema changes go to (the direct connection, as in
 * prisma.config.ts), described for the build log, or undefined when nothing
 * is configured (the local dev server).
 */
export function schemaDatabase(env) {
  const url =
    first(env, ["DATABASE_URL_UNPOOLED", "DIRECT_URL", "POSTGRES_URL_NON_POOLING"]) ??
    first(env, ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"]);
  return url === undefined ? undefined : describeDatabase(url);
}

/** What went wrong in a failed `prisma db push`, from its output. */
export function classifyPushFailure(output) {
  const text = `${output ?? ""}`;
  if (/accept-data-loss|data loss/i.test(text)) return "data-loss";
  // Two builds pushing to an empty database at once, or a database that is
  // waking up (Neon suspends idle computes): worth one more try.
  if (/already exists|P1001|P1002|P1017|ECONNRESET|ETIMEDOUT|timed out|Connection terminated|could not serialize|deadlock/i.test(text)) {
    return "transient";
  }
  return "other";
}
