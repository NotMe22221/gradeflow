// Where the database lives and how to connect to it, shared by the app
// (src/lib/db.ts), the Prisma CLI (prisma.config.ts), and the seed script.
// Server-side only (reads a file), but no server-only import so the CLI and
// the seed can use it. The helpers are pure: safe for unit tests.
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

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** True when `url` is the local server at `localUrl` (same loopback host and port), e.g. pasted into DATABASE_URL. */
function isLocalServer(url: string, localUrl: string): boolean {
  try {
    const target = new URL(url);
    const local = new URL(localUrl);
    return (
      LOOPBACK_HOSTS.has(target.hostname) &&
      LOOPBACK_HOSTS.has(local.hostname) &&
      (target.port || "5432") === (local.port || "5432")
    );
  } catch {
    return false;
  }
}

/**
 * The app's (pooled) URL and the CLI's direct URL for an environment, and
 * whether they point at Prisma's local server (nothing configured, or the
 * configured URL is that server's address).
 */
export function resolveDatabaseUrls(
  env: Env,
  localUrl: string = LOCAL_DATABASE_URL
): { url: string; directUrl: string; local: boolean } {
  const configured = first(env, ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"]);
  const url = configured ?? localUrl;
  const directUrl = first(env, ["DATABASE_URL_UNPOOLED", "DIRECT_URL", "POSTGRES_URL_NON_POOLING"]) ?? url;
  return { url, directUrl, local: configured === undefined || isLocalServer(configured, localUrl) };
}

// ---------------------------------------------------------------------------
// Query parameters, edited in place so the rest of the URL (an encoded
// password, Neon's `options=endpoint%3D...`) is passed on byte for byte.

function splitUrl(url: string): { base: string; pairs: string[]; hash: string } {
  const hashAt = url.indexOf("#");
  const hash = hashAt === -1 ? "" : url.slice(hashAt);
  const rest = hashAt === -1 ? url : url.slice(0, hashAt);
  const queryAt = rest.indexOf("?");
  if (queryAt === -1) return { base: rest, pairs: [], hash };
  return { base: rest.slice(0, queryAt), pairs: rest.slice(queryAt + 1).split("&").filter(Boolean), hash };
}

function decodePart(part: string): string {
  try {
    return decodeURIComponent(part.replace(/\+/g, " "));
  } catch {
    return part;
  }
}

function pairName(pair: string): string {
  const eq = pair.indexOf("=");
  return decodePart(eq === -1 ? pair : pair.slice(0, eq));
}

/** A query parameter's value (the last one wins, as in pg), or undefined. */
export function urlParam(url: string, name: string): string | undefined {
  let value: string | undefined;
  for (const pair of splitUrl(url).pairs) {
    if (pairName(pair) !== name) continue;
    const eq = pair.indexOf("=");
    value = eq === -1 ? "" : decodePart(pair.slice(eq + 1));
  }
  return value;
}

/** `url` with these query parameters set: each replaces every copy of that name, or is added at the end. */
function withUrlParams(url: string, values: Record<string, string>): string {
  const { base, pairs, hash } = splitUrl(url);
  const pending = new Map(Object.entries(values));
  const done = new Set<string>();
  const out: string[] = [];
  for (const pair of pairs) {
    const name = pairName(pair);
    if (!pending.has(name)) {
      out.push(pair);
    } else if (!done.has(name)) {
      done.add(name);
      out.push(`${encodeURIComponent(name)}=${encodeURIComponent(pending.get(name)!)}`);
    }
  }
  for (const [name, value] of pending) {
    if (!done.has(name)) out.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
  }
  return `${base}${out.length ? `?${out.join("&")}` : ""}${hash}`;
}

// ---------------------------------------------------------------------------
// TLS. Hosted Postgres URLs ask for TLS with `sslmode`, and the two clients
// that use them read it differently.

/**
 * The URL for the app's driver (pg). pg 8 already verifies the server's
 * certificate and host name for sslmode=prefer/require/verify-ca (it treats
 * them as verify-full, and prints a SECURITY WARNING saying so), but pg 9
 * will switch them to libpq's weaker meaning. Spelling it verify-full keeps
 * the verification whichever pg runs, and keeps the warning out of the logs.
 * A URL that opts into libpq semantics (uselibpqcompat=true) is left as it is.
 */
export function appDatabaseUrl(url: string): string {
  const mode = urlParam(url, "sslmode");
  if (mode !== "prefer" && mode !== "require" && mode !== "verify-ca") return url;
  if (urlParam(url, "uselibpqcompat") === "true") return url;
  return withUrlParams(url, { sslmode: "verify-full" });
}

/** Parameters with which a URL sets up its own certificates for the CLI or pg; such URLs are left alone. */
const CUSTOM_TLS_PARAMS = ["sslaccept", "sslcert", "sslkey", "sslrootcert", "sslidentity", "sslpassword"];

/**
 * The URL for the Prisma CLI (`prisma db push` in the Vercel build, `npm run
 * seed`). Its schema engine knows only sslmode=disable|prefer|require, reads
 * anything else (verify-ca, verify-full) as prefer, and by default accepts
 * any certificate (`sslaccept=accept_invalid_certs`), so a man-in-the-middle
 * could read the owner password. `sslaccept=strict` makes it check the
 * certificate chain against the system's CAs and the host name, as pg does
 * for the app. Applied only to URLs that ask for TLS (no sslmode or
 * sslmode=disable, as on the local server or a private network, stays as it
 * is), and not to URLs that configure their own certificates or ask for
 * libpq's unverified prefer/require (uselibpqcompat=true).
 */
export function cliDatabaseUrl(url: string): string {
  const mode = urlParam(url, "sslmode");
  const verify = mode === "verify-ca" || mode === "verify-full";
  if (!verify && mode !== "prefer" && mode !== "require") return url;
  if (!verify && urlParam(url, "uselibpqcompat") === "true") return url;
  if (CUSTOM_TLS_PARAMS.some((name) => urlParam(url, name) !== undefined)) return url;
  return withUrlParams(url, { sslmode: "require", sslaccept: "strict" });
}

// ---------------------------------------------------------------------------
// Pool and timeouts.

export type PoolSettings = {
  /** Connections this server process may open. */
  max: number;
  /** How long a query waits to connect, or for a free connection, before it fails (pg's default waits forever). */
  connectionTimeoutMillis: number;
  /** Idle connections close after this long. */
  idleTimeoutMillis: number;
  /** TCP keepalive, so a connection whose server vanished fails instead of hanging. */
  keepAlive: boolean;
  keepAliveInitialDelayMillis: number;
};

function intParam(url: string, name: string, min: number, max: number): number | undefined {
  const raw = urlParam(url, name);
  if (raw === undefined || !/^\d+$/.test(raw.trim())) return undefined;
  const value = Number(raw);
  return value >= min ? Math.min(value, max) : undefined;
}

/**
 * The pg pool for the app.
 *
 * Local (Prisma's `prisma dev` server): one connection. That server is one
 * PGlite session shared by every TCP connection and accepts 10 connections in
 * all; two transactions on separate connections interleave and fail
 * ("SET TRANSACTION ISOLATION LEVEL must be called before any query"), and a
 * bigger pool buys no speed because it runs one query at a time. Requests
 * queue for the connection instead, so the wait is generous: a stopped
 * local server is refused at once anyway.
 *
 * Hosted: a small pool per server instance (serverless hosts run many, and
 * the host's pooler, e.g. Neon's, multiplexes them), failing within 10 s when
 * the database can't be reached or every connection stays busy, so pages
 * fall back or show an error instead of hanging until the function's
 * maxDuration. Prisma's own URL parameters `connection_limit` (1-20) and
 * `connect_timeout` (seconds, 1-60) override the size and the wait, e.g.
 * `connect_timeout=15` for slow cold starts.
 */
export function poolSettings(url: string, local: boolean): PoolSettings {
  if (local) {
    return { max: 1, connectionTimeoutMillis: 30_000, idleTimeoutMillis: 10_000, keepAlive: false, keepAliveInitialDelayMillis: 0 };
  }
  const connectSeconds = intParam(url, "connect_timeout", 1, 60);
  return {
    max: intParam(url, "connection_limit", 1, 20) ?? 5,
    connectionTimeoutMillis: connectSeconds === undefined ? 10_000 : connectSeconds * 1000,
    idleTimeoutMillis: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  };
}

/**
 * The SQL that bounds every statement of one transaction on the server
 * (Postgres cancels a statement that runs, or waits for a lock, longer than
 * `ms`). SET LOCAL lasts until the transaction ends, so it works through a
 * transaction-mode pooler such as Neon's PgBouncer; pg's `statement_timeout`
 * option would not, because it is sent as a startup parameter, which
 * PgBouncer rejects ("unsupported startup parameter"). Always a positive
 * whole number of milliseconds: 0 would mean "no limit".
 */
export function transactionStatementTimeoutSql(ms: number): string {
  const value = Number.isFinite(ms) ? Math.max(1, Math.round(ms)) : 15_000;
  return `SET LOCAL statement_timeout = ${value}`;
}

// ---------------------------------------------------------------------------

const resolved = resolveDatabaseUrls(process.env, savedLocalUrl());

/** The app's connection (pooled when the host offers pooling). */
export const DATABASE_URL = appDatabaseUrl(resolved.url);

/** A direct (unpooled) connection for the Prisma CLI's schema changes, when the host provides one. */
export const DIRECT_DATABASE_URL = cliDatabaseUrl(resolved.directUrl);

/** True when the app uses Prisma's local Postgres server (nothing configured, or its address). */
export const USES_LOCAL_DATABASE = resolved.local;
