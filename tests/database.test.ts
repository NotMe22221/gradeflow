import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isRetryableConflict, retryDelayMs } from "@/lib/db-retry";
import { LOCAL_DATABASE_URL, resolveDatabaseUrls } from "@/lib/db-url";

describe("transaction retries", () => {
  it("retries Postgres serialization failures and deadlocks", () => {
    assert.equal(isRetryableConflict({ code: "P2034" }), true);
    assert.equal(isRetryableConflict({ code: "40001" }), true);
    assert.equal(isRetryableConflict({ code: "40P01" }), true);
    assert.equal(isRetryableConflict({ meta: { code: "40001" } }), true);
    assert.equal(isRetryableConflict(new Error("wrapped", { cause: { code: "40001" } })), true);
  });

  it("retries a conflict Postgres reports at COMMIT (the adapter's error, not P2034)", () => {
    // What Prisma 7 + @prisma/adapter-pg throw when COMMIT fails with 40001.
    assert.equal(
      isRetryableConflict({
        name: "DriverAdapterError",
        message: "TransactionWriteConflict",
        cause: {
          originalCode: "40001",
          originalMessage: "could not serialize access due to read/write dependencies among transactions",
          kind: "TransactionWriteConflict",
        },
      }),
      true
    );
    assert.equal(isRetryableConflict({ name: "DriverAdapterError", cause: { kind: "TransactionWriteConflict", originalCode: "40P01" } }), true);
  });

  it("never retries other errors", () => {
    assert.equal(isRetryableConflict(new Error("This paper was already handled")), false);
    assert.equal(isRetryableConflict({ code: "P2002" }), false);
    assert.equal(isRetryableConflict({ code: "23505" }), false);
    assert.equal(isRetryableConflict(null), false);
    assert.equal(isRetryableConflict("40001"), false);
  });

  it("never retries a connection lost during COMMIT (it may have committed)", () => {
    assert.equal(isRetryableConflict({ name: "DriverAdapterError", cause: { kind: "ConnectionClosed" } }), false);
    assert.equal(isRetryableConflict({ name: "DriverAdapterError", cause: { kind: "SocketTimeout" } }), false);
    assert.equal(isRetryableConflict({ code: "P1017", message: "Server has closed the connection." }), false);
  });

  it("backs off exponentially with jitter, capped", () => {
    assert.equal(retryDelayMs(1, 0), 10);
    assert.equal(retryDelayMs(3, 1), 120);
    assert.ok(retryDelayMs(2, 0.5) > retryDelayMs(1, 0.5));
    assert.equal(retryDelayMs(20, 0.5), 500);
  });
});

describe("database URL", () => {
  it("uses the local Postgres server when nothing is configured", () => {
    assert.deepEqual(resolveDatabaseUrls({}), { url: LOCAL_DATABASE_URL, directUrl: LOCAL_DATABASE_URL, local: true });
  });

  it("ignores an old SQLite setting", () => {
    assert.equal(resolveDatabaseUrls({ DATABASE_URL: "file:./prisma/dev.db" }).url, LOCAL_DATABASE_URL);
  });

  it("uses the host's pooled URL for the app and its direct URL for schema changes", () => {
    const urls = resolveDatabaseUrls({
      DATABASE_URL: "postgres://pooled.example/db",
      DATABASE_URL_UNPOOLED: "postgres://direct.example/db",
    });
    assert.deepEqual(urls, { url: "postgres://pooled.example/db", directUrl: "postgres://direct.example/db", local: false });
  });

  it("accepts Vercel's POSTGRES_* names", () => {
    const urls = resolveDatabaseUrls({ POSTGRES_URL: "postgres://a/db", POSTGRES_URL_NON_POOLING: "postgres://b/db" });
    assert.equal(urls.url, "postgres://a/db");
    assert.equal(urls.directUrl, "postgres://b/db");
  });
});
