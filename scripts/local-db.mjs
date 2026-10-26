// Starts Prisma's local Postgres server for development, unless a database is
// configured (DATABASE_URL / POSTGRES_URL in the environment, .env.local, or
// .env). Idempotent: an already-running server is left as it is. Used by
// `npm run dev`, `npm run seed`, `npm start`, and `npm run db:start`.
//
// The dev server picks its own free ports, so the connection string it prints
// is saved to prisma/.local-database-url (gitignored), where src/lib/db-url.ts
// reads it.

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const configured = ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"].some((name) => {
  const value = process.env[name]?.trim();
  return value && !value.startsWith("file:");
});

if (configured) process.exit(0);

if (process.env.VERCEL || process.env.CI) {
  console.error(
    "No database is configured. Set DATABASE_URL to a Postgres connection string " +
      "(on Vercel: Storage → Create Database → Neon, then redeploy)."
  );
  process.exit(1);
}

const require = createRequire(import.meta.url);
const prismaBin = path.join(path.dirname(require.resolve("prisma/package.json")), "build", "index.js");

console.log("Starting the local Postgres database (Prisma dev server \"gradesmart\")…");
const result = spawnSync(
  process.execPath,
  [prismaBin, "dev", "--detach", "--name", "gradesmart"],
  { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }
);

if (result.status !== 0) {
  console.error(result.stdout, result.stderr);
  console.error(
    "Couldn't start the local database. Run `npx prisma dev` to see why, or set DATABASE_URL " +
      "to any Postgres database in .env.local."
  );
  process.exit(result.status ?? 1);
}
const url = `${result.stdout}`.match(/postgres(?:ql)?:\/\/\S+/)?.[0];
if (!url) {
  console.error(result.stdout, result.stderr);
  console.error("The local database started but didn't report its address. Run `npx prisma dev ls` to see it.");
  process.exit(1);
}
const file = path.join(process.cwd(), "prisma", ".local-database-url");
mkdirSync(path.dirname(file), { recursive: true });
writeFileSync(file, `${url}\n`);
console.log(`Local database ready (${new URL(url).host}).`);
