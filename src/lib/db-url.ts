// Where the database lives, shared by the app (src/lib/db.ts), the Prisma CLI
// (prisma.config.ts), and the seed script. Server-side only (reads a file),
// but no server-only import so the CLI and the seed can use it.
//
// GradeSmart AI runs on Postgres everywhere:
// - Hosted (e.g. Vercel with Neon): the host sets DATABASE_URL (pooled) and
//   usually DATABASE_URL_UNPOOLED for schema changes. POSTGRES_URL /
//   POSTGRES_URL_NON_POOLING work too.
// - Local: with no URL set, Prisma's local Postgres (`prisma dev`) on a fixed
//   port, started by `npm run dev`, `npm run seed`, or `npm run db:start`.
//   scripts/local-db.mjs saves the address it reports to
//   prisma/.local-database-url.

import { readFileSync } from "node:fs";
import path from "node:path";

/** Prisma's local Postgres server on its usual port, if it hasn't reported another. */
export const LOCAL_DATABASE_URL = "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";

/** The address the local server reported when scripts/local-db.mjs started it. */
function savedLocalUrl(): string | undefined {
  try {
    const saved = readFileSync(path.join(process.cwd(), "prisma", ".local-database-url"), "utf8").trim();
    return /^postgres(ql)?:\/\/\S+$/.test(saved) ? saved : undefined;
  } catch {
    return undefined;
  }
}

type Env = Record<string, string | undefined>;

function first(env: Env, names: string[]): string | undefined {
  for (const name of names) {
    const value = env[name]?.trim();
    // An old SQLite setting ("file:./prisma/dev.db") from before the move to
    // Postgres is ignored rather than handed to the Postgres driver.
    if (value && !value.startsWith("file:")) return value;
  }
  return undefined;
}

/** The app's (pooled) URL and the CLI's direct URL for an environment. */
export function resolveDatabaseUrls(
  env: Env,
  localUrl: string = LOCAL_DATABASE_URL
): { url: string; directUrl: string; local: boolean } {
  const configured = first(env, ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"]);
  const url = configured ?? localUrl;
  const directUrl = first(env, ["DATABASE_URL_UNPOOLED", "DIRECT_URL", "POSTGRES_URL_NON_POOLING"]) ?? url;
  return { url, directUrl, local: configured === undefined };
}

const resolved = resolveDatabaseUrls(
  process.env,
  first(process.env, ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"]) ? undefined : savedLocalUrl()
);

/** The app's connection (pooled when the host offers pooling). */
export const DATABASE_URL = resolved.url;

/** A direct (unpooled) connection for the Prisma CLI's schema changes, when the host provides one. */
export const DIRECT_DATABASE_URL = resolved.directUrl;

/** True when no database is configured, so the local Postgres server is used. */
export const USES_LOCAL_DATABASE = resolved.local;
