import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { join } from "node:path";
import { describe, it } from "node:test";

// The approval gate: the AI only drafts, a teacher must approve, and students
// never see drafts, confidence, flags or answer keys. publish.ts is server
// code: "server-only" is stubbed here so it can run under the test runner,
// against an in-memory stand-in for the database transaction (no database).
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,", format: "module", shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const { publishApprovedGrade, PublishError } = await import("../src/lib/grades/publish");

const ROOT = join(import.meta.dirname, "..");

type Score = { criterionId: string; aiScore: number | null; finalScore: number | null; finalComment: string | null };

function fakeTx({
  role = "TEACHER",
  classTeacherId = "teacher-1",
  status = "APPROVED",
  approvedById = "teacher-1" as string | null,
  approvedAt = new Date("2026-10-27T10:00:00Z") as Date | null,
  published = false,
  scores = [
    { criterionId: "c1", aiScore: 9, finalScore: 7.5, finalComment: "Clear thesis, thin support." },
    { criterionId: "c2", aiScore: 5, finalScore: 4, finalComment: "" },
  ] as Score[],
  statusChangesDuringPublish = false,
} = {}) {
  const written: { publishedGrades: Record<string, unknown>[]; statuses: string[] } = { publishedGrades: [], statuses: [] };
  let current = status;
  const tx = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => ({ id: where.id, role }),
    },
    submission: {
      findUnique: async () => ({
        id: "sub-1",
        status: current,
        approvedById,
        approvedAt,
        teacherFeedback: "  Good start.  ",
        assignment: {
          class: { teacherId: classTeacherId },
          criteria: [
            { id: "c1", title: "Thesis", maxPoints: 10, position: 0 },
            { id: "c2", title: "Evidence", maxPoints: 5, position: 1 },
          ],
        },
        scores,
        publishedGrade: published ? { id: "pg-old" } : null,
      }),
      updateMany: async ({ where, data }: { where: { status: string; approvedById: string }; data: { status: string } }) => {
        if (statusChangesDuringPublish) current = "RETURNED";
        if (current !== where.status || approvedById !== where.approvedById) return { count: 0 };
        current = data.status;
        written.statuses.push(data.status);
        return { count: 1 };
      },
    },
    publishedGrade: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        written.publishedGrades.push(data);
        return { id: "pg-1" };
      },
    },
  };
  return { tx: tx as unknown as Parameters<typeof publishApprovedGrade>[0], written };
}

describe("publishApprovedGrade (the only writer of PublishedGrade)", () => {
  it("publishes the teacher's final scores, never the AI's, once the teacher has approved", async () => {
    const { tx, written } = fakeTx();
    const result = await publishApprovedGrade(tx, "sub-1", "teacher-1");
    assert.deepEqual(result, { publishedGradeId: "pg-1", totalScore: 11.5, maxScore: 15 });
    const [grade] = written.publishedGrades;
    assert.equal(grade.totalScore, 11.5, "7.5 + 4 from the teacher, not 9 + 5 from the AI");
    assert.equal(grade.aiTotalScore, 14, "the AI total is kept only for the AI-vs-final stat");
    assert.equal(grade.feedback, "Good start.");
    assert.match(String(grade.breakdown), /"score":7\.5/);
    for (const item of JSON.parse(String(grade.breakdown)) as Record<string, unknown>[]) {
      assert.deepEqual(Object.keys(item).sort(), ["comment", "criterionId", "maxPoints", "score", "title"], "no AI field is published");
    }
    assert.deepEqual(written.statuses, ["PUBLISHED"]);
  });

  const refusals: Array<[string, Parameters<typeof fakeTx>[0], string | null, RegExp]> = [
    ["an AI draft that no teacher approved", { status: "NEEDS_REVIEW", approvedById: null, approvedAt: null }, null, /has not been approved by you/],
    ["a paper the AI is still grading", { status: "GRADING", approvedById: null, approvedAt: null }, null, /has not been approved by you/],
    ["an approval by another teacher", { approvedById: "teacher-2" }, null, /has not been approved by you/],
    ["a teacher who doesn't teach the class", { classTeacherId: "teacher-2" }, null, /Only the teacher of this class/],
    ["a student acting as the publisher", { role: "STUDENT" }, null, /Only a teacher can publish/],
    ["a criterion with only an AI score", { scores: [{ criterionId: "c1", aiScore: 9, finalScore: null, finalComment: null }, { criterionId: "c2", aiScore: 5, finalScore: 4, finalComment: "" }] }, null, /"Thesis" needs a score/],
    ["a score above the maximum", { scores: [{ criterionId: "c1", aiScore: 9, finalScore: 11, finalComment: "" }, { criterionId: "c2", aiScore: 5, finalScore: 4, finalComment: "" }] }, null, /"Thesis" needs a score/],
    ["a score between half points", { scores: [{ criterionId: "c1", aiScore: 9, finalScore: 7.3, finalComment: "" }, { criterionId: "c2", aiScore: 5, finalScore: 4, finalComment: "" }] }, null, /in whole or half points/],
    ["a grade that is already published", { published: true }, null, /already published/],
  ];
  for (const [what, options, _unused, message] of refusals) {
    it(`refuses ${what}, and writes nothing`, async () => {
      const { tx, written } = fakeTx(options);
      await assert.rejects(publishApprovedGrade(tx, "sub-1", "teacher-1"), (error: unknown) => {
        assert.ok(error instanceof PublishError);
        assert.match(error.message, message);
        return true;
      });
      assert.equal(written.publishedGrades.length, 0);
      assert.deepEqual(written.statuses, []);
    });
  }

  it("fails the whole transaction when the paper changes while publishing", async () => {
    const { tx } = fakeTx({ statusChangesDuringPublish: true });
    await assert.rejects(publishApprovedGrade(tx, "sub-1", "teacher-1"), /changed while publishing/);
  });
});

// --- The boundaries around it --------------------------------------------------

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "generated" ? [] : files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

/** Source without comments, so a comment that names a forbidden field doesn't count. */
function code(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

const relative = (path: string) => path.slice(ROOT.length + 1);

describe("the gate's boundaries", () => {
  const src = files(join(ROOT, "src"));

  it("lets only publish.ts write a published grade", () => {
    const writers = src.filter((path) => /\bpublishedGrade\.(?:create|createMany|upsert|update|updateMany)\b/.test(code(path)));
    assert.deepEqual(writers.map(relative), ["src/lib/grades/publish.ts"]);
  });

  it("keeps every AI code path away from publishing", () => {
    const aiPaths = src.filter((path) =>
      /src\/lib\/(?:grading|scan|ai|try|eval)\/|src\/app\/api\/(?:grade|try|answer-key|submissions\/\[submissionId\]\/grade)\//.test(path)
    );
    assert.ok(aiPaths.length > 20);
    for (const path of aiPaths) {
      assert.doesNotMatch(code(path), /grades\/publish|grades\/review|publishApprovedGrade|approveAndPublish/, relative(path));
    }
  });

  it("never reads AI drafts, confidence, flags or evidence on any student surface", () => {
    const studentFiles = src.filter((path) => /src\/app\/\(student\)\/|src\/components\/student\//.test(path));
    assert.ok(studentFiles.length > 10);
    for (const path of studentFiles) {
      assert.doesNotMatch(
        code(path),
        /\b(?:aiGrade|aiScore|aiEvidence|aiJustification|aiTotalScore|evidenceFound|overallComment|criterionScore|scores:\s*\{)\b/,
        relative(path)
      );
      assert.doesNotMatch(code(path), /\bconfidence\b|\bflags\b/, relative(path));
    }
  });

  it("never sends a paper test's answer key to the student", () => {
    const page = code(join(ROOT, "src", "app", "(student)", "student", "assignments", "[assignmentId]", "page.tsx"));
    assert.match(page, /description: parseAssignmentKind\(assignment\.kind\) === "TEST" \? "" : description/);
    const rubric = code(join(ROOT, "src", "components", "student", "assignment-rubric.tsx"));
    assert.match(rubric, /\{!questions && item\.description \?/);
  });
});
