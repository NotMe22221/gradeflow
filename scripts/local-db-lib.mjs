// Pure helpers for scripts/local-db.mjs: no side effects on import, so the unit
// tests (tests/build-scripts-local-db.test.ts) can load them.

import path from "node:path";

/** The local server's name in `prisma dev` (`npx prisma dev ls` lists it). */
export const SERVER_NAME = "gradesmart";

/**
 * Prisma's dev-server CLI (@prisma/cli-dev), pinned. Without a version,
 * `prisma dev` installs @prisma/cli-dev@latest into a temp-folder cache keyed
 * by today's date, so the first start of every day needed the npm registry,
 * and the server's version changed by itself. A pinned version is cached
 * without a date, so after one download it works offline.
 */
export const PRISMA_DEV_VERSION = "0.16.28";

/** How long a running server's lock may go without a refresh. It refreshes it every 5 s; Prisma itself gives up after 10 s. */
export const LOCK_FRESH_MS = 20_000;

/**
 * Where Prisma's dev server keeps each server's state (env-paths("prisma-dev")
 * .data, as @prisma/dev does): <dir>/<name>/server.json and <dir>/<name>/.lock.
 */
export function prismaDevDataDir({ platform, env, homedir }) {
  const name = "prisma-dev-nodejs";
  if (platform === "darwin") return path.join(homedir, "Library", "Application Support", name);
  if (platform === "win32") return path.join(env.LOCALAPPDATA || path.join(homedir, "AppData", "Local"), name, "Data");
  return path.join(env.XDG_DATA_HOME || path.join(homedir, ".local", "share"), name);
}

/**
 * The parts of a server's server.json this script trusts: its process id, its
 * database port, and its plain postgres:// address on a loopback host.
 * Undefined when the file is missing, malformed, or in a format this script
 * doesn't know.
 */
export function parseServerRecord(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return undefined;
  }
  const pid = data?.pid;
  const url = data?.exports?.database?.connectionString;
  if (!Number.isInteger(pid) || pid <= 0 || typeof url !== "string") return undefined;
  if (!/^postgres(ql)?:\/\/\S+$/.test(url)) return undefined;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) return undefined;
  const port = Number(parsed.port || 5432);
  if (Number.isInteger(data.databasePort) && data.databasePort !== port) return undefined;
  return { pid, port, url };
}

/**
 * Whether a recorded server is running: its process is alive and it still
 * holds its lock (refreshed within LOCK_FRESH_MS). The lock check rules out a
 * process id reused after a reboot or a crash.
 */
export function isRecordedServerRunning({ pidAlive, lockMtimeMs, now }) {
  return pidAlive && lockMtimeMs !== undefined && now - lockMtimeMs <= LOCK_FRESH_MS;
}

/** The postgres:// address in `prisma dev`'s output (never the prisma+postgres:// one, which carries an API key). */
export function reportedDatabaseUrl(output) {
  const text = `${output ?? ""}`.replace(/\u001b\[[0-9;]*m/g, ""); // Colors, if any.
  return text.match(/(?<![+\w])postgres(?:ql)?:\/\/[^\s\u0000-\u001f"'`]+/)?.[0];
}

/**
 * Whether a failed `prisma dev` start is worth retrying. Two scripts starting
 * the stopped server at once, or a start right after a crash (its lock stays
 * held for about 10 s), fail with errors that clear up by themselves
 * ("Cannot read properties of undefined (reading 'connectionString')",
 * "Lock file is already being held", "Port … is not available"). A failed
 * download of the dev server (offline, registry unreachable) does not.
 */
export function isRetryableStartFailure(output) {
  return !/Failed to (install|import) (this )?dynamic subcommand|npm error|ENOTFOUND|EAI_AGAIN/i.test(`${output ?? ""}`);
}
