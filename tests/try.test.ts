import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { remainingCalls, DEFAULT_USAGE_LIMITS } from "@/lib/ai/usage";
import { RUBRIC_TEMPLATES } from "@/lib/demo/templates";
import { gradeWithDemoHeuristics } from "@/lib/grading/mock";
import { buildGradingUserMessage } from "@/lib/grading/prompt";
import { validateGrading } from "@/lib/grading/validate";
import { checkTryPaper, isTemplateId, toTryItResult, TRY_MAX_CHARS, tryItInput } from "@/lib/try/types";

const ROOT = join(import.meta.dirname, "..");
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), "utf8");

const PAPER = `Schools should start later because teenagers need more sleep than adults do. According to the Cedar Ridge survey, students sleep only 6.6 hours on school nights, and 71 percent feel tired in first period.
Some people say buses would cost more. However, the cost is small next to the cost of students falling behind.
In conclusion, the board should move the first bell to 8:30.`;

describe("try-it input", () => {
  it("accepts a short pasted paper and rejects empty, tiny, or oversized ones", () => {
    assert.deepEqual(checkTryPaper("  one\r\ntwo  "), { ok: false, error: "Paste at least 20 words." });
    assert.deepEqual(checkTryPaper("   "), { ok: false, error: "Paste a paper first." });
    assert.equal(checkTryPaper("word ".repeat(2_000)).ok, false);
    assert.match((checkTryPaper("x".repeat(TRY_MAX_CHARS + 1)) as { error: string }).error, /under 8,000 characters/);
    const ok = checkTryPaper(`  ${PAPER.replace(/\n/g, "\r\n")}  `);
    assert.ok(ok.ok);
    assert.equal(ok.ok && ok.paper, PAPER);
  });

  it("only takes the built-in rubric templates", () => {
    assert.ok(RUBRIC_TEMPLATES.every((template) => isTemplateId(template.id)));
    assert.equal(isTemplateId("anything"), false);
    assert.equal(isTemplateId(undefined), false);
  });

  it("grades against the chosen template, with the pasted paper as data", () => {
    const input = tryItInput("lab", PAPER);
    const lab = RUBRIC_TEMPLATES.find((template) => template.id === "lab");
    assert.equal(input.assignmentTitle, lab?.title);
    assert.deepEqual(
      input.criteria.map((criterion) => criterion.title),
      lab?.criteria.map((criterion) => criterion.title)
    );
    assert.deepEqual(input.criteria.map((criterion) => criterion.id), ["c1", "c2", "c3", "c4"]);
    assert.ok(buildGradingUserMessage(input).includes(`<student_paper>\n${PAPER}`));
  });
});

describe("try-it result", () => {
  const input = tryItInput("persuasive", PAPER);
  const grading = validateGrading(gradeWithDemoHeuristics(input), input);
  const result = (overrides: Partial<Parameters<typeof toTryItResult>[0]> = {}) =>
    toTryItResult({
      id: "run_1",
      templateId: "persuasive",
      paper: PAPER,
      engine: { kind: "demo", model: null },
      grading,
      createdAt: new Date("2026-10-27T10:00:00Z"),
      expiresAt: new Date("2026-10-28T10:00:00Z"),
      reused: false,
      ...overrides,
    });

  it("shows each criterion with its score, quote, and the rubric's total", () => {
    const shown = result();
    assert.equal(shown.rubricName, "Persuasive essay");
    assert.equal(shown.criteria.length, 4);
    assert.equal(shown.maxTotal, 25);
    assert.equal(shown.total, shown.criteria.reduce((sum, criterion) => sum + (criterion.score ?? 0), 0));
    for (const criterion of shown.criteria) {
      if (criterion.evidence) assert.ok(PAPER.includes(criterion.evidence), criterion.evidence);
    }
  });

  it("never shows an unverified quote, marks weak matches, and gives no total when a score is missing", () => {
    const tampered = {
      ...grading,
      criteria: grading.criteria.map((criterion, index) =>
        index === 0 ? { ...criterion, aiScore: null, evidence: "made-up words", evidenceFound: false } : criterion
      ),
      flags: [...grading.flags, { code: "WEAK_EVIDENCE" as const, criterionId: "c2", message: "weak" }],
    };
    const shown = result({ grading: tampered });
    assert.equal(shown.criteria[0].evidence, null);
    assert.equal(shown.criteria[1].weak, true);
    assert.equal(shown.criteria[2].weak, false);
    assert.equal(shown.total, null);
  });
});

describe("try-it allowance", () => {
  it("counts the tightest of the session, IP and daily caps", () => {
    const snapshot = { sessionCalls: 3, sessionOldest: null, ipCalls: 59, ipOldest: null, dayCalls: 10, daySpendMicroUsd: 0 };
    assert.equal(remainingCalls(snapshot, DEFAULT_USAGE_LIMITS), 1);
    assert.equal(remainingCalls({ ...snapshot, ipCalls: 0 }, DEFAULT_USAGE_LIMITS), 17);
    assert.equal(remainingCalls({ ...snapshot, dayCalls: 500 }, DEFAULT_USAGE_LIMITS), 0);
  });
});

describe("the sandbox is isolated", () => {
  const sandbox = read("src", "lib", "try", "sandbox.ts");
  const tryFiles = [
    ...readdirSync(join(ROOT, "src", "lib", "try")).map((name) => read("src", "lib", "try", name)),
    read("src", "app", "api", "try", "route.ts"),
    read("src", "app", "try", "page.tsx"),
  ];

  it("touches only its own table", () => {
    const models = new Set([...sandbox.matchAll(/\bdb\.(\w+)\./g)].map((match) => match[1]));
    assert.deepEqual([...models], ["tryItRun"]);
    for (const source of tryFiles) {
      assert.doesNotMatch(source, /\b(?:submission|publishedGrade|criterionScore|aiGrade|assignment|enrollment|user)\.(?:create|update|delete|upsert)/);
      assert.doesNotMatch(source, /grades\/publish|grades\/review|runAiFirstPass/);
    }
  });

  it("keys rows by a hash of its own cookie, and deletes only expired sandbox rows", () => {
    assert.match(sandbox, /sessionKey: cookieKey\(token\)/);
    assert.match(sandbox, /db\.tryItRun\.deleteMany\(\{ where: \{ expiresAt: \{ lte: now \} \} \}\)/);
    assert.match(sandbox, /httpOnly: true/);
    assert.match(sandbox, /expiresAt: \{ gt: now \}/, "expired rows are never shown");
    assert.match(read("prisma", "schema.prisma"), /model TryItRun \{[\s\S]*?expiresAt\s+DateTime[\s\S]*?\}/);
    assert.doesNotMatch(
      read("prisma", "schema.prisma").match(/model TryItRun \{[\s\S]*?\n\}/)?.[0] ?? "",
      /@relation/,
      "a sandbox row links to nothing"
    );
  });

  it("grades live calls under the usage caps with the sandbox's own session, and without the shared cache", () => {
    const grade = read("src", "lib", "try", "grade.ts");
    assert.match(grade, /createClaudeGrader\(\{ sessionToken: token, feature: "try_it", useCache: false \}\)/);
    const route = read("src", "app", "api", "try", "route.ts");
    assert.match(route, /if \(error instanceof AiLimitError\) return aiLimitResponse\(error/);
    assert.match(route, /readJsonWithLimit\(request,/);
    assert.match(route, /startsWith\("application\/json"\)/, "JSON only, so other sites can't post to it");
    assert.match(route, /if \(error instanceof SandboxLimitError\)/);
    assert.match(grade, /await checkRunLimits\(token, ipKey\);\s+const input/, "run caps are checked before grading");
  });

  it("puts the engine label and the limit on screen", () => {
    const workbench = read("src", "components", "try", "try-workbench.tsx");
    assert.match(workbench, /Demo grader: a keyword heuristic, not AI/);
    assert.match(workbench, /Live AI: Claude/);
    assert.match(workbench, /live tries/);
    assert.match(workbench, /No supporting quote found/);
  });
});
