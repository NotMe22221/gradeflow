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

  it("never retries other errors", () => {
    assert.equal(isRetryableConflict(new Error("This paper was already handled")), false);
    assert.equal(isRetryableConflict({ code: "P2002" }), false);
    assert.equal(isRetryableConflict({ code: "23505" }), false);
    assert.equal(isRetryableConflict(null), false);
    assert.equal(isRetryableConflict("40001"), false);
  });

  it("backs off with jitter", () => {
    assert.equal(retryDelayMs(1, 0), 15);
    assert.equal(retryDelayMs(3, 1), 180);
    assert.ok(retryDelayMs(2, 0.5) > retryDelayMs(1, 0.5));
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
