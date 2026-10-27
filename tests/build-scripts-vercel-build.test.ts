import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

type Env = Record<string, string | undefined>;
// scripts/*.mjs are plain JavaScript (the project doesn't allow JS in the
// type check), so they are loaded by path and typed here.
type VercelBuildPlan = {
  vercelBuildPlan(env: Env): { environment: string; changeDatabase: boolean; optIn: boolean };
  schemaDatabase(env: Env): string | undefined;
  describeDatabase(url: string): string;
  classifyPushFailure(output: string): "data-loss" | "transient" | "other";
};

const PLAN = "../scripts/vercel-build-plan.mjs";
const plan = (await import(PLAN)) as VercelBuildPlan;

describe("vercel-build: which builds change the database", () => {
  it("Production builds push the schema and seed an empty database", () => {
    assert.deepEqual(plan.vercelBuildPlan({ VERCEL: "1", VERCEL_ENV: "production" }), {
      environment: "production",
      changeDatabase: true,
      optIn: false,
    });
  });

  it("Preview builds leave the (possibly shared production) database alone by default", () => {
    assert.equal(plan.vercelBuildPlan({ VERCEL: "1", VERCEL_ENV: "preview" }).changeDatabase, false);
    assert.equal(plan.vercelBuildPlan({ VERCEL: "1", VERCEL_ENV: "development" }).changeDatabase, false);
    assert.equal(plan.vercelBuildPlan({ VERCEL: "1", VERCEL_ENV: "preview", ALLOW_PREVIEW_DB_CHANGES: "0" }).changeDatabase, false);
    assert.equal(plan.vercelBuildPlan({ VERCEL: "1", VERCEL_ENV: "preview", ALLOW_PREVIEW_DB_CHANGES: "false" }).changeDatabase, false);
    assert.equal(plan.vercelBuildPlan({ VERCEL: "1", VERCEL_ENV: "preview", ALLOW_PREVIEW_DB_CHANGES: "" }).changeDatabase, false);
  });

  it("a Preview build changes its database only with ALLOW_PREVIEW_DB_CHANGES (for Neon preview branches)", () => {
    for (const value of ["1", "true", "TRUE", " yes "]) {
      assert.deepEqual(plan.vercelBuildPlan({ VERCEL: "1", VERCEL_ENV: "preview", ALLOW_PREVIEW_DB_CHANGES: value }), {
        environment: "preview",
        changeDatabase: true,
        optIn: true,
      });
    }
  });

  it("a Vercel build without VERCEL_ENV is treated like a Preview", () => {
    assert.deepEqual(plan.vercelBuildPlan({ VERCEL: "1" }), { environment: "unknown", changeDatabase: false, optIn: false });
  });

  it("off Vercel (npm run vercel-build on a computer) it prepares the configured or local database, as before", () => {
    assert.deepEqual(plan.vercelBuildPlan({}), { environment: "local", changeDatabase: true, optIn: false });
    assert.equal(plan.vercelBuildPlan({ CI: "1", VERCEL_ENV: "preview" }).changeDatabase, true);
  });
});

describe("vercel-build: logs", () => {
  it("names the database that schema changes go to, never its credentials", () => {
    const env = {
      DATABASE_URL: "postgres://app:pooledsecret@ep-cool-1-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
      DATABASE_URL_UNPOOLED: "postgres://app:directsecret@ep-cool-1.us-east-2.aws.neon.tech/neondb?sslmode=require",
    };
    assert.equal(plan.schemaDatabase(env), "ep-cool-1.us-east-2.aws.neon.tech/neondb");
    assert.equal(plan.schemaDatabase({ DATABASE_URL: env.DATABASE_URL }), "ep-cool-1-pooler.us-east-2.aws.neon.tech/neondb");
    assert.equal(plan.schemaDatabase({ DATABASE_URL: "file:./prisma/dev.db" }), undefined);
    assert.equal(plan.schemaDatabase({}), undefined);
    assert.equal(plan.describeDatabase("postgres://u:p@127.0.0.1:5433/demo"), "127.0.0.1:5433/demo");
    assert.doesNotMatch(plan.describeDatabase("not a url with secret"), /secret/);
  });

  it("explains why prisma db push failed, and retries only what may pass on a second try", () => {
    assert.equal(
      plan.classifyPushFailure(
        "You are about to drop the column `nickname` on the `User` table, which still contains 1 non-null values.\n" +
          "Error: Use the --accept-data-loss flag to ignore the data loss warnings like prisma db push --accept-data-loss"
      ),
      "data-loss"
    );
    assert.equal(plan.classifyPushFailure('ERROR: relation "User" already exists'), "transient");
    assert.equal(plan.classifyPushFailure("Error: P1001: Can't reach database server at `ep-x.neon.tech:5432`"), "transient");
    assert.equal(plan.classifyPushFailure("Error: P1000: Authentication failed against database server"), "other");
  });
});

describe("package.json scripts", () => {
  const scripts = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")).scripts as Record<string, string>;

  it("vercel-build goes through scripts/vercel-build.mjs (which owns the Production/Preview rule)", () => {
    assert.equal(scripts["vercel-build"], "node scripts/vercel-build.mjs");
  });

  it("npm run seed checks the target before the schema push, and every db script uses the pinned dev-server CLI", () => {
    assert.match(scripts.seed, /tsx prisma\/seed\.ts --push-schema$/);
    assert.doesNotMatch(scripts.seed, /prisma db push/);
    for (const name of ["db:start", "db:stop", "db:status", "db:delete"]) {
      assert.match(scripts[name], /^node scripts\/local-db\.mjs\b/, name);
    }
  });
});

describe("seed guard", () => {
  it("never erases a database other than the local dev server, with no override, naming its host only", () => {
    // The guard runs before any connection or schema push, so this host is never contacted.
    const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: "postgres://owner:hunter2@db.example.invalid:5432/neondb?sslmode=require" };
    for (const name of ["POSTGRES_URL", "POSTGRES_PRISMA_URL", "DATABASE_URL_UNPOOLED", "DIRECT_URL", "POSTGRES_URL_NON_POOLING"]) {
      delete env[name];
    }
    // --yes was the old override; it must not erase anything any more.
    for (const extra of [[], ["--yes"]]) {
      const result = spawnSync(process.execPath, ["--import", "tsx", path.join("prisma", "seed.ts"), "--push-schema", ...extra], {
        cwd: process.cwd(),
        env,
        encoding: "utf8",
        timeout: 60_000,
      });
      const output = `${result.stdout}${result.stderr}`;
      assert.equal(result.status, 1, output);
      assert.match(output, /db\.example\.invalid:5432\/neondb/);
      assert.match(output, /only\s+ever erases the local dev server\. Nothing was changed\./);
      assert.doesNotMatch(output, /--yes/);
      assert.doesNotMatch(output, /hunter2/);
      assert.doesNotMatch(output, /in sync|Loaded Prisma config/);
    }
  });
});
