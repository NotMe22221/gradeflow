import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { DEMO_ACCOUNT_EMAILS, parseSetupIssue, pickDemoAccount, setupMessage } from "@/lib/auth/demo-accounts";
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
    assert.equal(parseSetupIssue(["no-demo", "x"]), "no-demo");
    assert.equal(parseSetupIssue("unreachable"), "unreachable");
    assert.equal(parseSetupIssue("seed"), null);
    assert.equal(parseSetupIssue("anything"), null);
    assert.equal(parseSetupIssue(undefined), null);
  });

  it("never tells a hosted deployment to run npm run seed", () => {
    for (const issue of ["empty", "no-demo", "unreachable"] as const) {
      const message = setupMessage(issue, false);
      assert.equal(message.command, null, issue);
      assert.doesNotMatch(`${message.title} ${message.body}`, /npm run/, issue);
    }
    assert.match(setupMessage("empty", false).body, /Redeploy the latest Production deployment/);
    assert.match(setupMessage("no-demo", false).body, /new, empty database/);
    assert.match(setupMessage("unreachable", false).body, /DATABASE_URL/);
  });

  it("gives the local command on a computer", () => {
    assert.equal(setupMessage("empty", true).command, "npm run seed");
    assert.equal(setupMessage("no-demo", true).command, "npm run seed");
    assert.equal(setupMessage("unreachable", true).command, "npm run dev");
  });
});
