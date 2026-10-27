import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  DEMO_ACCOUNT_EMAILS,
  parseSetupIssue,
  pickDemoAccount,
  setupIssueForError,
  setupMessage,
  setupPlace,
} from "@/lib/auth/demo-accounts";
import { DEMO_STUDENT_EMAIL, DEMO_TEACHER_EMAIL } from "@/lib/constants";

const ROOT = join(import.meta.dirname, "..");

describe("demo account lookup", () => {
  it("tries the current email first, then the ones from the app's earlier names", () => {
    assert.equal(DEMO_ACCOUNT_EMAILS.TEACHER[0], DEMO_TEACHER_EMAIL);
    assert.equal(DEMO_ACCOUNT_EMAILS.STUDENT[0], DEMO_STUDENT_EMAIL);
    assert.deepEqual(DEMO_ACCOUNT_EMAILS.TEACHER.slice(1), ["morgan.hale@gradesmart.example", "morgan.hale@gradeflow.example"]);
    assert.deepEqual(DEMO_ACCOUNT_EMAILS.STUDENT.slice(1), [
      "ava.quillon@students.gradesmart.example",
      "ava.quillon@students.gradeflow.example",
    ]);
  });

  it("finds the demo account in a database seeded under an earlier name", () => {
    const rows = [
      { id: "student", email: "ava.quillon@students.gradesmart.example", role: "STUDENT" },
      { id: "teacher", email: "morgan.hale@gradesmart.example", role: "TEACHER" },
    ];
    assert.equal(pickDemoAccount(rows, "TEACHER")?.id, "teacher");
    assert.equal(pickDemoAccount(rows, "STUDENT")?.id, "student");
  });

  it("prefers the current email when both exist, and checks the role", () => {
    const rows = [
      { id: "old", email: "morgan.hale@gradeflow.example", role: "TEACHER" },
      { id: "new", email: DEMO_TEACHER_EMAIL, role: "TEACHER" },
    ];
    assert.equal(pickDemoAccount(rows, "TEACHER")?.id, "new");
    assert.equal(pickDemoAccount([{ id: "x", email: DEMO_TEACHER_EMAIL, role: "STUDENT" }], "TEACHER"), null);
    assert.equal(pickDemoAccount([], "STUDENT"), null);
  });

  it("only reads: demo sign-in never creates or changes an account", () => {
    const actions = readFileSync(join(ROOT, "src", "lib", "auth", "actions.ts"), "utf8");
    assert.match(actions, /email: \{ in: \[\.\.\.DEMO_ACCOUNT_EMAILS\[role\]\] \}/);
    assert.doesNotMatch(actions, /\buser\.(?:create|update|upsert|delete)/);
    assert.doesNotMatch(actions, /setup=seed/);
  });
});

describe("the setup banner", () => {
  it("reads the reason from ?setup=, and ignores the old reason-less link", () => {
    assert.equal(parseSetupIssue("empty"), "empty");
    assert.equal(parseSetupIssue("no-schema"), "no-schema");
    assert.equal(parseSetupIssue(["no-demo", "x"]), "no-demo");
    assert.equal(parseSetupIssue("unreachable"), "unreachable");
    assert.equal(parseSetupIssue("seed"), null);
    assert.equal(parseSetupIssue("anything"), null);
    assert.equal(parseSetupIssue(undefined), null);
  });

  it("tells a database with no tables apart from one it can't reach", () => {
    // Prisma's code for a missing table (Postgres 42P01).
    assert.equal(setupIssueForError(Object.assign(new Error("relation does not exist"), { code: "P2021" })), "no-schema");
    assert.equal(setupIssueForError(Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" })), "unreachable");
    assert.equal(setupIssueForError(new Error("timeout")), "unreachable");
    assert.equal(setupIssueForError("odd"), "unreachable");
  });

  it("picks the fix by where the app runs", () => {
    assert.equal(setupPlace({ vercel: true, devServer: false }), "vercel");
    assert.equal(setupPlace({ vercel: true, devServer: true }), "vercel");
    assert.equal(setupPlace({ vercel: false, devServer: true }), "dev-server");
    assert.equal(setupPlace({ vercel: false, devServer: false }), "own-database");
  });

  it("never gives a Vercel deployment a command", () => {
    for (const issue of ["no-schema", "empty", "no-demo", "unreachable"] as const) {
      const message = setupMessage(issue, "vercel");
      assert.equal(message.command, null, issue);
      assert.doesNotMatch(`${message.title} ${message.body}`, /npm run|npx/, issue);
    }
    assert.match(setupMessage("no-schema", "vercel").body, /creates the tables/);
    assert.match(setupMessage("empty", "vercel").body, /Redeploy the latest Production deployment/);
    assert.match(setupMessage("no-demo", "vercel").body, /new, empty database/);
    assert.match(setupMessage("unreachable", "vercel").body, /try again in a minute[\s\S]*DATABASE_URL/);
  });

  it("gives Prisma's dev database `npm run seed`, and only it", () => {
    assert.equal(setupMessage("no-schema", "dev-server").command, "npm run seed");
    assert.equal(setupMessage("empty", "dev-server").command, "npm run seed");
    assert.equal(setupMessage("no-demo", "dev-server").command, "npm run seed");
    // The app showing the banner is already running: start only the database.
    assert.equal(setupMessage("unreachable", "dev-server").command, "npm run db:start");
    for (const issue of ["no-schema", "empty", "no-demo", "unreachable"] as const) {
      assert.doesNotMatch(String(setupMessage(issue, "own-database").command), /npm run seed/, issue);
    }
  });

  it("gives your own database a command that creates the tables and seeds only an empty database", () => {
    for (const issue of ["no-schema", "empty", "no-demo"] as const) {
      assert.equal(setupMessage(issue, "own-database").command, "npx prisma db push && npx tsx prisma/seed.ts --if-empty");
    }
    assert.equal(setupMessage("unreachable", "own-database").command, null);
    assert.match(setupMessage("unreachable", "own-database").body, /DATABASE_URL/);
  });
});
