import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { nextRetryDelayMs, RETRY_POLICY, retryDelayMs } from "@/lib/db-retry";

const commitConflict = { name: "DriverAdapterError", cause: { kind: "TransactionWriteConflict", originalCode: "40001" } };

describe("transaction retry policy", () => {
  it("retries a conflict with the backoff delay", () => {
    assert.equal(nextRetryDelayMs({ code: "P2034" }, 1, 0, 0.5), retryDelayMs(1, 0.5));
    assert.equal(nextRetryDelayMs(commitConflict, 3, 100, 0), retryDelayMs(3, 0));
  });

  it("never retries an error that isn't a conflict", () => {
    assert.equal(nextRetryDelayMs(new Error("This paper was already handled"), 1, 0, 0.5), null);
    assert.equal(nextRetryDelayMs({ name: "DriverAdapterError", cause: { kind: "ConnectionClosed" } }, 1, 0, 0.5), null);
  });

  it("allows several attempts, then gives up", () => {
    assert.ok(RETRY_POLICY.attempts >= 6, "a burst of conflicting requests needs several attempts");
    for (let attempt = 1; attempt < RETRY_POLICY.attempts; attempt++) {
      assert.notEqual(nextRetryDelayMs(commitConflict, attempt, 0, 0.5), null, `attempt ${attempt} is retried`);
    }
    assert.equal(nextRetryDelayMs(commitConflict, RETRY_POLICY.attempts, 0, 0.5), null);
  });

  it("starts no retry past the time budget", () => {
    assert.equal(nextRetryDelayMs(commitConflict, 1, RETRY_POLICY.budgetMs, 0.5), null);
    assert.equal(nextRetryDelayMs(commitConflict, 2, RETRY_POLICY.budgetMs - 1, 0.99), null);
    assert.notEqual(nextRetryDelayMs(commitConflict, 2, RETRY_POLICY.budgetMs - 100, 0.99), null);
  });

  it("keeps the total wait well inside a route's maxDuration", () => {
    let worst = 0;
    for (let attempt = 1; attempt < RETRY_POLICY.attempts; attempt++) worst += retryDelayMs(attempt, 0.999999);
    assert.ok(worst <= RETRY_POLICY.budgetMs, `all backoff waits together: ${worst} ms`);
    assert.ok(RETRY_POLICY.budgetMs <= 5_000);
  });

  it("jitters within half to one and a half times the step, never zero", () => {
    for (let attempt = 1; attempt <= 10; attempt++) {
      const low = retryDelayMs(attempt, 0);
      const high = retryDelayMs(attempt, 0.999999);
      assert.ok(low > 0);
      assert.ok(Math.abs(high - 3 * low) <= 1, `attempt ${attempt}: ${low}-${high}`);
    }
    assert.ok(retryDelayMs(10, 0.999999) <= RETRY_POLICY.maxDelayMs * 1.5);
  });
});
