import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

// scripts/*.mjs are plain JavaScript (the project doesn't allow JS in the
// type check), so they are loaded by path and typed here.
type LocalDbLib = {
  SERVER_NAME: string;
  PRISMA_DEV_VERSION: string;
  LOCK_FRESH_MS: number;
  prismaDevDataDir(input: { platform: string; env: Record<string, string | undefined>; homedir: string }): string;
  parseServerRecord(text: string): { pid: number; port: number; url: string } | undefined;
  isRecordedServerRunning(input: { pidAlive: boolean; lockMtimeMs: number | undefined; now: number }): boolean;
  reportedDatabaseUrl(output: string | undefined): string | undefined;
  isRetryableStartFailure(output: string): boolean;
};

const LIB = "../scripts/local-db-lib.mjs";
const lib = (await import(LIB)) as LocalDbLib;

const LOCAL = "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";

function record(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    name: "markwise",
    pid: 900,
    port: 51213,
    databasePort: 51214,
    exports: {
      database: { connectionString: LOCAL },
      ppg: { url: "prisma+postgres://localhost:51213/?api_key=secret" },
    },
    ...overrides,
  });
}

describe("local dev server: Prisma's record of it", () => {
  it("finds the state folder where @prisma/dev keeps it (env-paths)", () => {
    assert.equal(
      lib.prismaDevDataDir({ platform: "linux", env: {}, homedir: "/home/ada" }),
      path.join("/home/ada", ".local", "share", "prisma-dev-nodejs")
    );
    assert.equal(
      lib.prismaDevDataDir({ platform: "linux", env: { XDG_DATA_HOME: "/data" }, homedir: "/home/ada" }),
      path.join("/data", "prisma-dev-nodejs")
    );
    assert.equal(
      lib.prismaDevDataDir({ platform: "darwin", env: {}, homedir: "/Users/ada" }),
      path.join("/Users/ada", "Library", "Application Support", "prisma-dev-nodejs")
    );
    assert.equal(
      lib.prismaDevDataDir({ platform: "win32", env: { LOCALAPPDATA: "C:/Users/ada/AppData/Local" }, homedir: "C:/Users/ada" }),
      path.join("C:/Users/ada/AppData/Local", "prisma-dev-nodejs", "Data")
    );
  });

  it("reads the process, port, and plain postgres:// address from server.json", () => {
    assert.deepEqual(lib.parseServerRecord(record()), { pid: 900, port: 51214, url: LOCAL });
  });

  it("rejects a record it can't trust", () => {
    assert.equal(lib.parseServerRecord("not json"), undefined);
    assert.equal(lib.parseServerRecord("{}"), undefined);
    assert.equal(lib.parseServerRecord(record({ pid: "900" })), undefined);
    assert.equal(lib.parseServerRecord(record({ pid: 0 })), undefined);
    // The port it says it uses must be the one in its address.
    assert.equal(lib.parseServerRecord(record({ databasePort: 51299 })), undefined);
    // Only a loopback address: never connect elsewhere on the strength of a file.
    assert.equal(
      lib.parseServerRecord(record({ databasePort: undefined, exports: { database: { connectionString: "postgres://u:p@db.example.com/x" } } })),
      undefined
    );
    assert.equal(
      lib.parseServerRecord(record({ exports: { database: { connectionString: "prisma+postgres://localhost:51213/?api_key=x" } } })),
      undefined
    );
  });

  it("counts a server as running only while its process lives and its lock is fresh", () => {
    const now = 1_000_000;
    assert.equal(lib.isRecordedServerRunning({ pidAlive: true, lockMtimeMs: now - 4_000, now }), true);
    // Crashed: the lock is still fresh for a moment, but the process is gone.
    assert.equal(lib.isRecordedServerRunning({ pidAlive: false, lockMtimeMs: now - 1_000, now }), false);
    // After a reboot the old process id may belong to something else; the lock is stale.
    assert.equal(lib.isRecordedServerRunning({ pidAlive: true, lockMtimeMs: now - lib.LOCK_FRESH_MS - 1, now }), false);
    // Stopped cleanly: no lock at all.
    assert.equal(lib.isRecordedServerRunning({ pidAlive: true, lockMtimeMs: undefined, now }), false);
  });
});

describe("local dev server: starting it", () => {
  it("pins the dev-server CLI so its cache isn't keyed by the date", () => {
    assert.match(lib.PRISMA_DEV_VERSION, /^\d+\.\d+\.\d+$/);
    assert.equal(lib.SERVER_NAME, "markwise");
  });

  it("takes the plain postgres:// address from prisma dev's output, never the prisma+postgres:// one", () => {
    assert.equal(lib.reportedDatabaseUrl(`Loaded Prisma config.\n${LOCAL}\n`), LOCAL);
    assert.equal(lib.reportedDatabaseUrl(`url: \u001b[36m${LOCAL}\u001b[39m`), LOCAL);
    assert.equal(lib.reportedDatabaseUrl("prisma+postgres://localhost:51213/?api_key=abc"), undefined);
    assert.equal(lib.reportedDatabaseUrl(`prisma+postgres://localhost:51213/?api_key=abc\n${LOCAL}`), LOCAL);
    assert.equal(lib.reportedDatabaseUrl("postgresql://postgres:postgres@127.0.0.1:5432/db"), "postgresql://postgres:postgres@127.0.0.1:5432/db");
    assert.equal(lib.reportedDatabaseUrl(undefined), undefined);
  });

  it("retries the start failures that clear up by themselves, not a failed download", () => {
    assert.equal(lib.isRetryableStartFailure("ERROR  Cannot read properties of undefined (reading 'connectionString')"), true);
    assert.equal(lib.isRetryableStartFailure("ERROR  Lock file is already being held"), true);
    assert.equal(lib.isRetryableStartFailure("ERROR  Port 51223 is not available."), true);
    assert.equal(
      lib.isRetryableStartFailure(
        "Fetching latest updates for this subcommand...\n ERROR  Failed to install dynamic subcommand via npm.\nnpm error code ECONNREFUSED"
      ),
      false
    );
    assert.equal(lib.isRetryableStartFailure("npm error code ENOTFOUND"), false);
    assert.equal(lib.isRetryableStartFailure("Failed to import this dynamic subcommand."), false);
  });
});
