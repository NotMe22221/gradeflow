// Prisma's local Postgres server for development (`prisma dev`, server name
// "markwise"), used when no database is configured.
//
//   node scripts/local-db.mjs          start it if needed (npm run dev, npm run seed,
//                                      npm start, npm run db:start)
//   node scripts/local-db.mjs stop     stop it (npm run db:stop)
//   node scripts/local-db.mjs status   list Prisma's local servers (npm run db:status)
//   node scripts/local-db.mjs delete   stop it and delete its data (npm run db:delete)
//
// Start does nothing when a database is configured (DATABASE_URL / POSTGRES_URL
// in the environment, .env.local, or .env). Otherwise:
// - If Prisma's record of the server says it is running (its process is alive
//   and holds the server's lock) and its port answers, it is used as it is:
//   `prisma dev` isn't run, so this needs no network and takes milliseconds.
// - If not (first run, or the server stopped, e.g. after a reboot), it runs
//   `prisma dev --detach`, which creates or restarts the server and reports
//   its address. One start at a time: a lock file makes a second script wait
//   for the first and then use the server it started, and a start that fails
//   for a passing reason (the lock a crashed server leaves behind for
//   20-30 s) is retried for about 40 s.
//
// Prisma's dev-server CLI is pinned (PRISMA_DEV_VERSION) and cached in
// node_modules/.cache/markwise-prisma-dev rather than the temp folder (which
// a reboot may clear), so only the very first start needs the npm registry.
// The stop/status/delete commands use the same pinned, cached CLI.
//
// The server picks its own free ports, so its address is saved to
// prisma/.local-database-url (gitignored), where src/lib/db-url.ts reads it.

import { spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync, writeSync } from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { config } from "dotenv";

import {
  isRecordedServerRunning,
  isRetryableStartFailure,
  parseServerRecord,
  PRISMA_DEV_VERSION,
  prismaDevDataDir,
  reportedDatabaseUrl,
  SERVER_NAME,
} from "./local-db-lib.mjs";

const require = createRequire(import.meta.url);
const prismaPackageDir = path.dirname(require.resolve("prisma/package.json"));
const prismaBin = path.join(prismaPackageDir, "build", "index.js");

/** Where src/lib/db-url.ts looks for the local server's address. */
const URL_FILE = path.join(process.cwd(), "prisma", ".local-database-url");
/** The pinned dev-server CLI's cache (node_modules/.cache/…), and the start lock. */
const CACHE_DIR = path.join(prismaPackageDir, "..", ".cache", "markwise-prisma-dev");
const START_LOCK = path.join(CACHE_DIR, "start.lock");

const HINTS = [
  "To look into it:",
  `  npm run db:status   lists Prisma's local servers and their state (npx prisma dev ls)`,
  `  npm run db:stop     stops this one (npx prisma dev stop ${SERVER_NAME})`,
  `  npm run db:delete   deletes it and its demo data (npx prisma dev rm --force ${SERVER_NAME});`,
  "                      then `npm run seed` creates a fresh one",
  "Or use any Postgres database instead: set DATABASE_URL in .env.local.",
].join("\n");

// ---------------------------------------------------------------------------

function prismaDev(args, { capture }) {
  mkdirSync(CACHE_DIR, { recursive: true });
  return spawnSync(process.execPath, [prismaBin, "dev", `@${PRISMA_DEV_VERSION}`, ...args], {
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
    // Prisma caches the dev-server CLI under os.tmpdir().
    env: { ...process.env, TMPDIR: CACHE_DIR, TMP: CACHE_DIR, TEMP: CACHE_DIR },
  });
}

function outputOf(result) {
  return [result.stdout, result.stderr, result.error?.message].filter(Boolean).join("\n");
}

/** The first error line of `prisma dev`'s output, for a one-line progress message. */
function startError(output) {
  const line = output.split("\n").find((text) => /\bERROR\b/.test(text)) ?? "";
  const text = line.replace(/\u001b\[[0-9;]*m/g, "").replace(/^.*?\bERROR\b\s*/, "").trim();
  return text ? text.slice(0, 100) : "no details";
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

/** Prisma's own record of the server: whether it is running, and its address. */
function recordedServer() {
  const dir = path.join(
    prismaDevDataDir({ platform: process.platform, env: process.env, homedir: os.homedir() }),
    SERVER_NAME
  );
  let record;
  try {
    record = parseServerRecord(readFileSync(path.join(dir, "server.json"), "utf8"));
  } catch {
    record = undefined;
  }
  if (!record) return { running: false };
  let lockMtimeMs;
  try {
    lockMtimeMs = statSync(path.join(dir, ".lock")).mtimeMs;
  } catch {
    lockMtimeMs = undefined;
  }
  const running = isRecordedServerRunning({ pidAlive: pidAlive(record.pid), lockMtimeMs, now: Date.now() });
  return { running, url: record.url };
}

/** Whether something accepts TCP connections at the URL's host and port (within about a second). */
function answers(url) {
  return new Promise((resolve) => {
    let target;
    try {
      target = new URL(url);
    } catch {
      resolve(false);
      return;
    }
    const socket = net.connect({ host: target.hostname.replace(/^\[|\]$/g, ""), port: Number(target.port || 5432) });
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(1000, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

/** The server's address when it is running and answering, else undefined. */
async function runningServerUrl() {
  const server = recordedServer();
  return server.running && (await answers(server.url)) ? server.url : undefined;
}

function savedUrl() {
  try {
    const saved = readFileSync(URL_FILE, "utf8").trim();
    return /^postgres(ql)?:\/\/\S+$/.test(saved) ? saved : undefined;
  } catch {
    return undefined;
  }
}

function ready(url) {
  if (savedUrl() !== url) {
    mkdirSync(path.dirname(URL_FILE), { recursive: true });
    writeFileSync(URL_FILE, `${url}\n`);
  }
  console.log(`Local database ready (${new URL(url).host}).`);
  return 0;
}

// ---------------------------------------------------------------------------
// One start at a time (per checkout). A lock whose process is gone (Ctrl+C,
// crash) or that is very old is removed.

function takeStartLock() {
  try {
    const fd = openSync(START_LOCK, "wx");
    writeSync(fd, JSON.stringify({ pid: process.pid, at: Date.now() }));
    closeSync(fd);
    return true;
  } catch (error) {
    if (error?.code === "EEXIST") return false;
    throw error;
  }
}

/** Removes the start lock if its holder is gone; true when there is no lock any more. */
function removeStaleStartLock() {
  let text;
  let mtimeMs;
  try {
    text = readFileSync(START_LOCK, "utf8");
    mtimeMs = statSync(START_LOCK).mtimeMs;
  } catch {
    return true; // Gone already.
  }
  let holder;
  try {
    holder = JSON.parse(text);
  } catch {
    holder = undefined; // Being written right now, or garbage.
  }
  const age = Date.now() - (Number.isFinite(holder?.at) ? holder.at : mtimeMs);
  const stale = Number.isInteger(holder?.pid) ? !pidAlive(holder.pid) || age > 5 * 60_000 : age > 5_000;
  if (!stale) return false;
  try {
    // Only if it is still the same lock (another waiter may have replaced it).
    if (readFileSync(START_LOCK, "utf8") === text) rmSync(START_LOCK, { force: true });
    return true;
  } catch {
    return !existsSync(START_LOCK);
  }
}

/** Runs `fn` holding the start lock; returns `fn`'s result, or the address of a server another script started meanwhile. */
async function withStartLock(fn) {
  mkdirSync(CACHE_DIR, { recursive: true });
  const deadline = Date.now() + 3 * 60_000;
  let waiting = false;
  while (!takeStartLock()) {
    const url = await runningServerUrl();
    if (url) return ready(url);
    if (removeStaleStartLock()) continue;
    if (Date.now() > deadline) {
      console.error(
        `Gave up waiting for another script to start the local database. If nothing else is starting it, ` +
          `delete ${path.relative(process.cwd(), START_LOCK)} and try again.`
      );
      return 1;
    }
    if (!waiting) {
      console.log("Another script is starting the local database. Waiting for it…");
      waiting = true;
    }
    await sleep(500);
  }
  try {
    return await fn();
  } finally {
    rmSync(START_LOCK, { force: true });
  }
}

// ---------------------------------------------------------------------------

async function start() {
  config({ path: ".env.local", quiet: true });
  config({ quiet: true });

  const configured = ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"].some((name) => {
    const value = process.env[name]?.trim();
    return value && !value.startsWith("file:");
  });
  if (configured) return 0;

  if (process.env.VERCEL || process.env.CI) {
    console.error(
      "No database is configured. Set DATABASE_URL to a Postgres connection string " +
        "(on Vercel: Storage → Create Database → Neon, connect it to the project, then redeploy)."
    );
    return 1;
  }

  // Already running: nothing to start, no network needed.
  const running = await runningServerUrl();
  if (running) return ready(running);

  return withStartLock(async () => {
    // Another script may have started it while this one waited for the lock.
    const startedMeanwhile = await runningServerUrl();
    if (startedMeanwhile) return ready(startedMeanwhile);

    console.log(`Starting the local Postgres database (Prisma dev server "${SERVER_NAME}")…`);
    const cached = existsSync(path.join(CACHE_DIR, "@prisma", `cli-dev@${PRISMA_DEV_VERSION}`, "node_modules"));
    if (!cached) console.log("Downloading Prisma's local Postgres server first (one time only; needs internet)…");

    // About 40 s of retries: a server that stopped abruptly (kill, crash) leaves
    // its lock behind, and Prisma takes 20-30 s to give up on it.
    let result = prismaDev(["--detach", "--name", SERVER_NAME], { capture: true });
    for (const seconds of [2, 3, 4, 5, 6, 8, 10]) {
      if (result.status === 0 || !isRetryableStartFailure(outputOf(result))) break;
      const url = await runningServerUrl();
      if (url) return ready(url);
      console.log(`The local database isn't ready yet (${startError(outputOf(result))}). Trying again in ${seconds} s…`);
      await sleep(seconds * 1000);
      result = prismaDev(["--detach", "--name", SERVER_NAME], { capture: true });
    }

    if (result.status === 0) {
      const url = reportedDatabaseUrl(result.stdout) ?? (await runningServerUrl());
      if (url) return ready(url);
      console.error(outputOf(result));
      console.error("The local database started but didn't report its address.");
      console.error(HINTS);
      return 1;
    }

    const output = outputOf(result);
    console.error(output);
    if (!isRetryableStartFailure(output)) {
      console.error(
        "\nCouldn't download Prisma's local Postgres server. The first start needs the npm registry " +
          "(internet); later starts work offline. Connect and run the command again, or use any " +
          "Postgres database instead: set DATABASE_URL in .env.local."
      );
    } else {
      console.error(`\nCouldn't start the local database (Prisma dev server "${SERVER_NAME}").`);
      console.error(HINTS);
    }
    return result.status || 1;
  });
}

function stop() {
  return prismaDev(["stop", SERVER_NAME], { capture: false }).status ?? 1;
}

function status() {
  return prismaDev(["ls"], { capture: false }).status ?? 1;
}

function remove() {
  console.log(`Deleting the local database (Prisma dev server "${SERVER_NAME}") and its demo data…`);
  const result = prismaDev(["rm", "--force", SERVER_NAME], { capture: false });
  if (result.status !== 0) return result.status ?? 1;
  rmSync(URL_FILE, { force: true });
  console.log("Deleted. `npm run seed` creates a fresh one with the demo data.");
  return 0;
}

const commands = { start, stop, status, delete: remove };
const name = process.argv[2] ?? "start";
if (!Object.hasOwn(commands, name)) {
  console.error(`Unknown command "${name}". Use one of: ${Object.keys(commands).join(", ")}.`);
  process.exit(2);
}
process.exit(await commands[name]());
