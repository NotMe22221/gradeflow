// Vercel's build command: `npm run vercel-build` (Vercel runs it in place of
// `npm run build`).
//
//   1. Check that a database is configured (scripts/local-db.mjs). On Vercel a
//      missing DATABASE_URL stops the build with the fix; on a computer with
//      nothing set, the local dev server is started.
//   2. Only for a build that owns its database (Production, or a build off
//      Vercel; a Preview only with ALLOW_PREVIEW_DB_CHANGES=1, see
//      vercel-build-plan.mjs):
//        prisma db push         creates or updates the tables; never with
//                               --accept-data-loss
//        prisma/seed.ts --if-empty
//                               loads the demo data into an empty database;
//                               never erases anything, safe for concurrent builds
//      Other Preview builds leave the database alone and only compare its
//      schema with the branch's (read-only), warning when they differ.
//   3. next build.
//
// The log names the database host, never the connection string.

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

import { classifyPushFailure, schemaDatabase, vercelBuildPlan } from "./vercel-build-plan.mjs";

const TAG = "[vercel-build]";
const require = createRequire(import.meta.url);

function log(message) {
  console.log(`${TAG} ${message}`);
}

function warn(message) {
  console.warn(`${TAG} WARNING: ${message}`);
}

function stop(message, code = 1) {
  console.error(`${TAG} ${message}`);
  process.exit(code || 1);
}

/** A package's command-line entry point, run with this Node (no PATH or .cmd lookups). */
function bin(pkg, name = pkg) {
  const manifest = require.resolve(`${pkg}/package.json`);
  const { bin: bins } = JSON.parse(readFileSync(manifest, "utf8"));
  return path.join(path.dirname(manifest), typeof bins === "string" ? bins : bins[name]);
}

/**
 * Runs a step with its output shown live, and returns its exit code and, with
 * `capture`, the last part of its output (to explain a failure).
 */
function run(script, args, capture) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], { stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit" });
    let tail = "";
    const keep = (chunk) => {
      tail = (tail + chunk).slice(-20_000);
    };
    child.stdout?.on("data", (chunk) => {
      process.stdout.write(chunk);
      keep(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      process.stderr.write(chunk);
      keep(chunk);
    });
    child.on("error", (error) => resolve({ code: 1, output: `${tail}\n${error.message}` }));
    child.on("close", (code, signal) => resolve({ code: code ?? (signal ? 1 : 0), output: tail }));
  });
}

async function step(title, script, args, { capture = false } = {}) {
  log(title);
  const started = Date.now();
  const result = await run(script, args, capture);
  if (result.code === 0) log(`Done in ${((Date.now() - started) / 1000).toFixed(1)} s.`);
  return result;
}

// ---------------------------------------------------------------------------

// Off Vercel, read .env.local / .env like the other scripts (Vercel sets the
// variables itself).
config({ path: ".env.local", quiet: true });
config({ quiet: true });

const plan = vercelBuildPlan(process.env);
const prisma = bin("prisma");

log(
  plan.environment === "local"
    ? "Build outside Vercel (VERCEL is not set)."
    : plan.environment === "unknown"
      ? "Vercel build without VERCEL_ENV, so it is treated like a Preview build. To fix, turn on " +
        "Settings → Environment Variables → Automatically expose System Environment Variables."
      : `Vercel build for the ${plan.environment} environment (VERCEL_ENV=${plan.environment}).`
);

// 1. A database.
const localDb = path.join(path.dirname(fileURLToPath(import.meta.url)), "local-db.mjs");
const database = await step("Checking the database settings…", localDb, []);
if (database.code !== 0) stop("Stopped: no usable database (see above).", database.code);
log(`Database: ${schemaDatabase(process.env) ?? "the local dev server"}.`);

// 2. Schema and demo data.
if (plan.changeDatabase) {
  if (plan.optIn) log("ALLOW_PREVIEW_DB_CHANGES is on, so this build updates its database like a Production build.");

  const pushTitle = "Creating or updating the tables (prisma db push; never accepts data loss)…";
  let push = await step(pushTitle, prisma, ["db", "push"], { capture: true });
  if (push.code !== 0 && classifyPushFailure(push.output) === "transient") {
    log("That looked temporary (another build changing the schema at the same time, or the database waking up). Trying once more in 5 s…");
    await sleep(5000);
    push = await step(pushTitle, prisma, ["db", "push"], { capture: true });
  }
  if (push.code !== 0) {
    if (classifyPushFailure(push.output) === "data-loss") {
      stop(
        "Stopped: this schema change would delete data, and the build never accepts that. Nothing was " +
          "changed or deployed. Make the change additive (a new optional column, or one with a default), " +
          "or apply it to the database yourself first. See README.md → Deploy to Vercel → Schema changes.",
        push.code
      );
    }
    stop(
      "Stopped: `prisma db push` failed (see above), so nothing was deployed. Check DATABASE_URL and " +
        "DATABASE_URL_UNPOOLED in Settings → Environment Variables, and that the database is running.",
      push.code
    );
  }

  const seed = await step(
    "Loading the demo data if the database is empty (seed --if-empty; never erases anything)…",
    bin("tsx"),
    [path.join("prisma", "seed.ts"), "--if-empty"]
  );
  if (seed.code !== 0) {
    stop("Stopped: loading the demo data failed (see above). The database was left as it was; redeploy to try again.", seed.code);
  }
} else {
  const which =
    plan.environment === "unknown"
      ? "Builds without VERCEL_ENV"
      : `${plan.environment[0].toUpperCase()}${plan.environment.slice(1)} builds`;
  log(
    `The database is left as it is: ${which} don't push the schema or seed; only Production builds do. ` +
      "Unless Neon gives each preview its own database branch, previews share the production database, " +
      "and a branch's schema would replace production's. With Neon's preview branches turned on, set " +
      "ALLOW_PREVIEW_DB_CHANGES=1 for the Preview environment to let preview builds update their own branch."
  );
  const diff = await step(
    "Comparing this branch's schema with the database (read-only)…",
    prisma,
    ["migrate", "diff", "--from-config-datasource", "--to-schema", path.join("prisma", "schema.prisma"), "--exit-code"]
  );
  if (diff.code === 2) {
    warn(
      "this branch's schema differs from the database's (see above), and this build doesn't change the " +
        "database. Pages that use the difference will fail in this preview. Give previews their own database " +
        "branch (README.md → Deploy to Vercel → Preview deployments), or check the change in Production."
    );
  } else if (diff.code !== 0) {
    warn("couldn't compare the schema with the database (see above). Building anyway.");
  } else {
    log("The database schema matches this branch.");
  }
}

// 3. The app.
const build = await step("Building the app (next build)…", bin("next"), ["build"]);
if (build.code !== 0) stop("Stopped: next build failed (see above).", build.code);
