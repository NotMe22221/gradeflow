import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parse } from "pg-connection-string";

import {
  appDatabaseUrl,
  cliDatabaseUrl,
  LOCAL_DATABASE_URL,
  poolSettings,
  resolveDatabaseUrls,
  transactionStatementTimeoutSql,
  urlParam,
} from "@/lib/db-url";

const NEON = "postgres://neondb_owner:p%40ss%3Aw0rd@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";

describe("Prisma CLI URL (schema engine TLS)", () => {
  it("makes the CLI verify the certificate for a URL that asks for TLS", () => {
    assert.equal(
      cliDatabaseUrl(NEON),
      "postgres://neondb_owner:p%40ss%3Aw0rd@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&sslaccept=strict"
    );
    assert.equal(
      cliDatabaseUrl("postgres://u:p@db.example.com/app?sslmode=require&channel_binding=require"),
      "postgres://u:p@db.example.com/app?sslmode=require&channel_binding=require&sslaccept=strict"
    );
  });

  it("maps modes the schema engine doesn't know (it would read them as prefer) to require + strict", () => {
    for (const mode of ["verify-full", "verify-ca", "prefer"]) {
      const url = cliDatabaseUrl(`postgres://u:p@db.example.com/app?sslmode=${mode}`);
      assert.equal(urlParam(url, "sslmode"), "require", mode);
      assert.equal(urlParam(url, "sslaccept"), "strict", mode);
    }
  });

  it("leaves URLs that don't ask for TLS alone (local server, docker, private network)", () => {
    for (const url of [
      LOCAL_DATABASE_URL,
      "postgres://u:p@db:5432/app",
      "postgres://u:p@192.168.1.20:5432/app?sslmode=disable",
      "postgres://u:p@db.example.com/app?sslmode=no-verify",
    ]) {
      assert.equal(cliDatabaseUrl(url), url);
    }
  });

  it("leaves URLs that configure their own certificates or accept mode alone", () => {
    for (const url of [
      "postgres://u:p@db.example.com/app?sslmode=require&sslaccept=accept_invalid_certs",
      "postgres://u:p@db.example.com/app?sslmode=verify-full&sslrootcert=/etc/ssl/rds.pem",
      "postgres://u:p@db.example.com/app?sslmode=require&sslcert=./ca.pem",
      "postgres://u:p@db.example.com/app?sslmode=require&uselibpqcompat=true",
    ]) {
      assert.equal(cliDatabaseUrl(url), url);
    }
    // libpq's verify-full still verifies, so it is hardened even with uselibpqcompat.
    assert.equal(urlParam(cliDatabaseUrl("postgres://u:p@h/db?uselibpqcompat=true&sslmode=verify-full"), "sslaccept"), "strict");
  });

  it("keeps every other part of the URL byte for byte", () => {
    const url = "postgres://u:p%23%3F@h.example:6543/db?options=endpoint%3Dep-x&sslmode=require&sslmode=prefer#frag";
    assert.equal(cliDatabaseUrl(url), "postgres://u:p%23%3F@h.example:6543/db?options=endpoint%3Dep-x&sslmode=require&sslaccept=strict#frag");
  });
});

describe("app URL (pg TLS)", () => {
  it("spells the verification pg already does as verify-full", () => {
    for (const mode of ["require", "prefer", "verify-ca"]) {
      assert.equal(
        appDatabaseUrl(`postgres://u:p@db.example.com/app?sslmode=${mode}&channel_binding=require`),
        "postgres://u:p@db.example.com/app?sslmode=verify-full&channel_binding=require"
      );
    }
  });

  it("gives pg a verifying TLS config (what pg 8 already used for require)", () => {
    const config = parse(appDatabaseUrl(NEON));
    // An empty TLS options object: Node verifies the chain and the host name.
    assert.deepEqual(config.ssl, {});
    assert.equal(config.password, "p@ss:w0rd");
    assert.equal(config.host, "ep-cool-name-123456-pooler.us-east-2.aws.neon.tech");
  });

  it("leaves other URLs alone", () => {
    for (const url of [
      LOCAL_DATABASE_URL,
      "postgres://u:p@db:5432/app",
      "postgres://u:p@db.example.com/app?sslmode=verify-full",
      "postgres://u:p@db.example.com/app?sslmode=no-verify",
      "postgres://u:p@db.example.com/app?sslmode=require&uselibpqcompat=true",
    ]) {
      assert.equal(appDatabaseUrl(url), url);
    }
  });

  it("never adds the CLI-only sslaccept parameter", () => {
    assert.equal(urlParam(appDatabaseUrl(NEON), "sslaccept"), undefined);
  });
});

describe("connection pool", () => {
  it("uses one connection on the local server, so transactions never interleave on it", () => {
    const local = poolSettings(LOCAL_DATABASE_URL, true);
    assert.equal(local.max, 1);
    assert.ok(local.connectionTimeoutMillis > 0);
    // connection_limit can't raise it: the local server needs one connection.
    assert.equal(poolSettings(`${LOCAL_DATABASE_URL}&connection_limit=5`, true).max, 1);
  });

  it("uses a small pool that fails fast when hosted", () => {
    const hosted = poolSettings(NEON, false);
    assert.equal(hosted.max, 5);
    assert.ok(hosted.connectionTimeoutMillis >= 5_000 && hosted.connectionTimeoutMillis <= 10_000);
    assert.ok(hosted.idleTimeoutMillis > 0);
    assert.equal(hosted.keepAlive, true);
  });

  it("honors Prisma's connection_limit and connect_timeout URL parameters, within bounds", () => {
    const tuned = poolSettings(`${NEON}&connection_limit=2&connect_timeout=15`, false);
    assert.equal(tuned.max, 2);
    assert.equal(tuned.connectionTimeoutMillis, 15_000);
    const clamped = poolSettings(`${NEON}&connection_limit=500&connect_timeout=3600`, false);
    assert.equal(clamped.max, 20);
    assert.equal(clamped.connectionTimeoutMillis, 60_000);
    // 0 means "wait forever" in libpq: never that.
    const invalid = poolSettings(`${NEON}&connection_limit=0&connect_timeout=0`, false);
    assert.equal(invalid.max, 5);
    assert.equal(invalid.connectionTimeoutMillis, 10_000);
    assert.equal(poolSettings(`${NEON}&connect_timeout=abc`, false).connectionTimeoutMillis, 10_000);
  });
});

describe("local server detection", () => {
  it("treats a configured URL that is the local server's address as local", () => {
    const saved = "postgres://postgres:postgres@localhost:51234/template1?sslmode=disable";
    assert.equal(resolveDatabaseUrls({ DATABASE_URL: saved }, saved).local, true);
    assert.equal(resolveDatabaseUrls({ DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:51234/template1" }, saved).local, true);
    assert.equal(resolveDatabaseUrls({ DATABASE_URL: "postgres://postgres@localhost:5432/app" }, saved).local, false);
    assert.equal(resolveDatabaseUrls({ DATABASE_URL: "postgres://u:p@db.example.com:51234/app" }, saved).local, false);
    assert.equal(resolveDatabaseUrls({ DATABASE_URL: NEON }).local, false);
  });
});

describe("transaction statement timeout", () => {
  it("is a SET LOCAL with a positive whole number of milliseconds", () => {
    assert.equal(transactionStatementTimeoutSql(15_000), "SET LOCAL statement_timeout = 15000");
    assert.equal(transactionStatementTimeoutSql(2_500.4), "SET LOCAL statement_timeout = 2500");
    assert.equal(transactionStatementTimeoutSql(0), "SET LOCAL statement_timeout = 1");
    assert.equal(transactionStatementTimeoutSql(Number.NaN), "SET LOCAL statement_timeout = 15000");
  });
});

describe("URL parameters", () => {
  it("reads the last copy, decoded, like pg", () => {
    assert.equal(urlParam("postgres://h/db?sslmode=disable&sslmode=require", "sslmode"), "require");
    assert.equal(urlParam("postgres://h/db?options=endpoint%3Dep-x", "options"), "endpoint=ep-x");
    assert.equal(urlParam("postgres://h/db", "sslmode"), undefined);
    assert.equal(urlParam("postgres://h/db?ssl", "ssl"), "");
  });
});
