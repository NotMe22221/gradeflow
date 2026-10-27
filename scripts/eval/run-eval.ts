// Grade the ELLIPSE sample and compare with the human scores.
//
//   npm run eval
//       The demo grader: free, offline. Writes eval/results/demo.json.
//
//   npm run eval -- --live
//       Plans a live Claude run and stops: prints the model, the number of
//       API calls, and the worst-case cost. Nothing is sent.
//
//   npm run eval -- --live --confirm-calls <n>
//       Runs it, once <n> matches the planned call count. Needs
//       ANTHROPIC_API_KEY. Writes eval/results/live.json.
//
// Live options:
//   --model <id>         default: ANTHROPIC_MODEL, else claude-haiku-5-5
//   --effort <level>     default: ANTHROPIC_EFFORT, else medium
//   --max-calls <n>      hard cap on API calls (default 30)
//   --budget-usd <x>     hard cap on estimated spend (default 0.50)
//
// Live results are cached in eval/.cache (not committed) by paper, rubric,
// model and prompt, so a rerun only pays for essays that failed or changed.
// No test runs this script.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Anthropic from "@anthropic-ai/sdk";

import { costMicroUsd, formatUsd, worstCaseCostMicroUsd } from "../../src/lib/ai/pricing";
import { createMemoryUsageStore, createUsageGuard, type UsageLimits } from "../../src/lib/ai/usage";
import {
  ELLIPSE_CRITERIA,
  ELLIPSE_CRITERION_IDS,
  ellipseGradingInput,
  type EllipseEssay,
  type EvalResults,
  type EvalRun,
} from "../../src/lib/eval/ellipse";
import { constantBaseline, formatPointsDiff, formatRate, summarize, type ScorePair } from "../../src/lib/eval/metrics";
import { parseCachedGrade, type GradeCacheStore } from "../../src/lib/grading/cache";
import {
  claudeCacheKey,
  CLAUDE_MAX_TOKENS,
  CLAUDE_REQUEST_BUDGET,
  ClaudeGrader,
  parseEffort,
} from "../../src/lib/grading/claude-grader";
import { DemoGrader } from "../../src/lib/grading/mock";
import { buildGradingSystemPrompt, buildGradingUserMessage } from "../../src/lib/grading/prompt";
import type { Grader } from "../../src/lib/grading/types";
import { validateGrading } from "../../src/lib/grading/validate";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA = path.join(ROOT, "eval", "data", "ellipse-sample.json");
const RESULTS = path.join(ROOT, "eval", "results");
const CACHE = path.join(ROOT, "eval", ".cache");
const DEFAULT_MODEL = "claude-haiku-5-5";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

/** Saved live results on disk, keyed like the app's AiGradeCache. */
function fileCache(): GradeCacheStore {
  mkdirSync(CACHE, { recursive: true });
  const file = (key: string) => path.join(CACHE, `${key}.json`);
  return {
    async get(key) {
      return existsSync(file(key)) ? parseCachedGrade(readFileSync(file(key), "utf8")) : null;
    },
    async set(key, _parts, value) {
      writeFileSync(file(key), JSON.stringify(value));
    },
  };
}

const essays = (JSON.parse(readFileSync(DATA, "utf8")) as { essays: EllipseEssay[] }).essays;
const live = process.argv.includes("--live");

let grader: Grader;
let run: Omit<EvalRun, "ranAt" | "calls" | "cachedResults" | "failedEssays" | "inputTokens" | "outputTokens" | "estimatedCostUsd">;
let usage: ReturnType<typeof createMemoryUsageStore> | null = null;
let cacheHits = 0;

if (!live) {
  grader = new DemoGrader();
  run = {
    grader: "demo",
    model: null,
    effort: null,
    label: "Demo grader: a local keyword heuristic, not AI",
  };
} else {
  const model = option("--model") ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  const effort = parseEffort(option("--effort") ?? process.env.ANTHROPIC_EFFORT);
  const maxCalls = Number(option("--max-calls") ?? 30);
  const budgetUsd = Number(option("--budget-usd") ?? 0.5);
  if (!Number.isInteger(maxCalls) || maxCalls < 1) fail("--max-calls must be a whole number of at least 1.");
  if (!Number.isFinite(budgetUsd) || budgetUsd <= 0) fail("--budget-usd must be a positive number.");

  const cache = fileCache();
  // Essays with a saved result for this model and prompt cost nothing.
  let planned = 0;
  let worstCase = 0;
  for (const essay of essays) {
    const input = ellipseGradingInput(essay);
    if (await cache.get(claudeCacheKey(input, model, effort).key)) continue;
    planned++;
    worstCase += worstCaseCostMicroUsd(model, {
      textChars: buildGradingSystemPrompt().length + buildGradingUserMessage(input).length,
      maxOutputTokens: CLAUDE_MAX_TOKENS,
    });
  }

  console.log(
    [
      "",
      "Live evaluation plan",
      `  Model:          ${model} (effort ${effort})`,
      `  Essays:         ${essays.length} (${essays.length - planned} already cached)`,
      `  API calls:      ${planned}`,
      `  Worst case:     ${formatUsd(worstCase)} (estimate from list prices, every call at its full output limit)`,
      `  Hard caps:      ${maxCalls} calls, ${formatUsd(budgetUsd * 1_000_000)}`,
      "",
    ].join("\n")
  );
  if (planned > maxCalls) fail(`That is more than --max-calls ${maxCalls}. Raise it to run every essay.`);
  if (option("--confirm-calls") !== String(planned)) {
    fail(`Nothing was sent. To start, run:\n\n  npm run eval -- --live --confirm-calls ${planned}${option("--model") ? ` --model ${model}` : ""}`);
  }
  if (!process.env.ANTHROPIC_API_KEY) fail("Set ANTHROPIC_API_KEY to run the live evaluation.");

  usage = createMemoryUsageStore();
  const limits: UsageLimits = {
    perSessionPerHour: maxCalls,
    perIpPerHour: maxCalls,
    perDay: maxCalls,
    spendPerDayMicroUsd: Math.round(budgetUsd * 1_000_000),
  };
  grader = new ClaudeGrader({
    client: new Anthropic({ maxRetries: CLAUDE_REQUEST_BUDGET.maxRetries, timeout: CLAUDE_REQUEST_BUDGET.timeout }),
    model,
    effort,
    guard: createUsageGuard({
      store: usage,
      subject: async () => ({ sessionKey: "eval", ipKey: "eval", userId: null }),
      limits,
    }),
    cache,
  });
  run = { grader: "claude", model, effort, label: `Live: Claude (${model}), the same prompt and validation the app uses` };
}

const pairs: ScorePair[] = [];
let failedEssays = 0;
for (const [index, essay] of essays.entries()) {
  const input = ellipseGradingInput(essay);
  let scores: Map<string, number | null>;
  try {
    const validated = validateGrading(await grader.grade(input), input);
    if (grader instanceof ClaudeGrader && grader.cacheHit) cacheHits++;
    scores = new Map(validated.criteria.map((criterion) => [criterion.criterionId, criterion.aiScore]));
  } catch (error) {
    failedEssays++;
    console.error(`  ${essay.id}: ${error instanceof Error ? error.message : String(error)}`);
    scores = new Map();
  }
  for (const criterion of ELLIPSE_CRITERION_IDS) {
    pairs.push({ essayId: essay.id, criterion, human: essay.scores[criterion], model: scores.get(criterion) ?? null });
  }
  process.stdout.write(`\r  Graded ${index + 1}/${essays.length}`);
}
process.stdout.write("\n");

const rows = usage?.rows ?? [];
const results: EvalResults = {
  version: 1,
  dataset: {
    name: "ELLIPSE corpus (Crossley et al., 2023)",
    license: "CC BY-NC-SA 4.0",
    source: "https://github.com/scrosseye/ELLIPSE-Corpus",
    sample: "30 essays, 5 from each of 6 bands of the human Overall score (eval/data/README.md)",
    essays: essays.length,
  },
  run: {
    ...run,
    ranAt: new Date().toISOString().slice(0, 10),
    calls: rows.length,
    cachedResults: cacheHits,
    failedEssays,
    inputTokens: rows.reduce((sum, row) => sum + (row.usage?.inputTokens ?? 0), 0),
    outputTokens: rows.reduce((sum, row) => sum + (row.usage?.outputTokens ?? 0), 0),
    estimatedCostUsd:
      rows.reduce((sum, row) => sum + (row.usage ? costMicroUsd(row.model, row.usage) : row.costMicroUsd), 0) / 1_000_000,
  },
  criteria: ELLIPSE_CRITERIA.map(({ id, title }) => ({ id, title })),
  summary: summarize(pairs, ELLIPSE_CRITERION_IDS),
  baseline: summarize(constantBaseline(pairs, 3), ELLIPSE_CRITERION_IDS),
  pairs,
};

mkdirSync(RESULTS, { recursive: true });
const out = path.join(RESULTS, live ? "live.json" : "demo.json");
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);

const { summary, baseline } = results;
console.log(
  [
    "",
    `${run.label}. ${summary.essays} essays, ${summary.scored} of ${summary.pairs} scores given.`,
    "",
    "  Criterion            Exact   Within 1   MAE    (always-3 baseline: exact / within 1 / MAE)",
    ...summary.perCriterion.map((row, index) => {
      const base = baseline.perCriterion[index];
      const title = ELLIPSE_CRITERIA[index].title.padEnd(20);
      return `  ${title} ${formatRate(row.exact).padStart(5)}   ${formatRate(row.within1).padStart(8)}   ${formatPointsDiff(row.mae).padStart(4)}   (${formatRate(base.exact)} / ${formatRate(base.within1)} / ${formatPointsDiff(base.mae)})`;
    }),
    `  ${"All".padEnd(20)} ${formatRate(summary.exact).padStart(5)}   ${formatRate(summary.within1).padStart(8)}   ${formatPointsDiff(summary.mae).padStart(4)}   (${formatRate(baseline.exact)} / ${formatRate(baseline.within1)} / ${formatPointsDiff(baseline.mae)})`,
    "",
    live ? `  ${results.run.calls} API calls, about ${formatUsd(results.run.estimatedCostUsd * 1_000_000)} (estimate).` : "  No API calls (demo grader).",
    `  Wrote ${path.relative(ROOT, out)}. This is a small sample: treat the numbers as rough.`,
    "",
  ].join("\n")
);
