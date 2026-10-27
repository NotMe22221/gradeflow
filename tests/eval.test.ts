import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  ELLIPSE_CRITERION_IDS,
  ELLIPSE_RUBRIC,
  ellipseGradingInput,
  type EllipseEssay,
  type EvalResults,
  type NoEvalRun,
} from "@/lib/eval/ellipse";
import { baselineVerdict, constantBaseline, formatRate, summarize, type ScorePair } from "@/lib/eval/metrics";
import { buildGradingUserMessage } from "@/lib/grading/prompt";

const ROOT = join(import.meta.dirname, "..");
const readJson = <T>(...parts: string[]) => JSON.parse(readFileSync(join(ROOT, ...parts), "utf8")) as T;

describe("evaluation metrics", () => {
  const pairs: ScorePair[] = [
    { essayId: "a", criterion: "grammar", human: 3, model: 3 },
    { essayId: "b", criterion: "grammar", human: 2, model: 3 },
    { essayId: "c", criterion: "grammar", human: 4.5, model: 2 },
    { essayId: "a", criterion: "syntax", human: 3.5, model: 3.5 },
    { essayId: "b", criterion: "syntax", human: 2.5, model: null },
  ];

  it("reports exact agreement, within 1, and MAE over the pairs the grader scored", () => {
    const summary = summarize(pairs, ["grammar", "syntax"]);
    assert.equal(summary.essays, 3);
    assert.equal(summary.pairs, 5);
    assert.equal(summary.scored, 4);
    assert.equal(summary.exact, 2 / 4);
    assert.equal(summary.within1, 3 / 4);
    assert.equal(summary.mae, (0 + 1 + 2.5 + 0) / 4);

    const [grammar, syntax] = summary.perCriterion;
    assert.deepEqual(
      { criterion: grammar.criterion, scored: grammar.scored, exact: grammar.exact, within1: grammar.within1, mae: grammar.mae },
      { criterion: "grammar", scored: 3, exact: 1 / 3, within1: 2 / 3, mae: 3.5 / 3 }
    );
    assert.equal(syntax.pairs, 2);
    assert.equal(syntax.scored, 1);
    assert.equal(syntax.meanHuman, 3);
  });

  it("lists the largest disagreements first, leaving out agreements", () => {
    const { largest } = summarize(pairs, ["grammar", "syntax"]);
    assert.deepEqual(
      largest.map((pair) => [pair.essayId, pair.criterion, pair.difference]),
      [
        ["c", "grammar", -2.5],
        ["b", "grammar", 1],
      ]
    );
  });

  it("reports nothing as agreement when nothing was scored", () => {
    const summary = summarize([{ essayId: "a", criterion: "grammar", human: 3, model: null }], ["grammar"]);
    assert.equal(summary.exact, null);
    assert.equal(summary.mae, null);
    assert.equal(formatRate(summary.exact), "–");
  });

  it("says whether a grader beats the baseline, counting a tiny gap as a tie", () => {
    const at = (mae: number | null) => ({ ...summarize([], []), mae });
    assert.equal(baselineVerdict(at(0.5), at(0.7)), "beats");
    assert.equal(baselineVerdict(at(0.76), at(0.68)), "trails");
    assert.equal(baselineVerdict(at(0.7), at(0.68)), "matches");
    assert.equal(baselineVerdict(at(null), at(0.68)), null);
  });

  it("builds a constant baseline from the same pairs", () => {
    const baseline = summarize(constantBaseline(pairs, 3), ["grammar", "syntax"]);
    assert.equal(baseline.scored, 5);
    assert.equal(baseline.mae, (0 + 1 + 1.5 + 0.5 + 0.5) / 5);
  });
});

describe("the ELLIPSE sample", () => {
  const { essays } = readJson<{ essays: EllipseEssay[] }>("eval", "data", "ellipse-sample.json");

  it("has 30 essays, five per Overall band, with every score on the 1 to 5 half-point scale", () => {
    assert.equal(essays.length, 30);
    const bands = new Map<string, number>();
    for (const essay of essays) bands.set(essay.band, (bands.get(essay.band) ?? 0) + 1);
    assert.deepEqual([...bands.values()], [5, 5, 5, 5, 5, 5]);
    assert.equal(new Set(essays.map((essay) => essay.id)).size, 30);
    for (const essay of essays) {
      assert.deepEqual(Object.keys(essay.scores).sort(), [...ELLIPSE_CRITERION_IDS].sort());
      for (const score of Object.values(essay.scores)) {
        assert.ok(score >= 1 && score <= 5 && Number.isInteger(score * 2), `${essay.id}: ${score}`);
      }
      assert.ok(essay.text.split(/\s+/).length > 50, essay.id);
    }
  });

  it("keeps no demographic or other columns", () => {
    for (const essay of essays) assert.deepEqual(Object.keys(essay).sort(), ["band", "id", "prompt", "scores", "text"]);
    const text = readFileSync(join(ROOT, "eval", "data", "ellipse-sample.json"), "utf8");
    assert.doesNotMatch(text, /gender|race|ethnicity|"grade"|SES/);
  });

  it("records its source and license next to the data", () => {
    const readme = readFileSync(join(ROOT, "eval", "data", "README.md"), "utf8");
    assert.match(readme, /CC BY-NC-SA 4\.0/);
    assert.match(readme, /github\.com\/scrosseye\/ELLIPSE-Corpus/);
    assert.match(readme, /Crossley, S\. A\./);
    assert.match(readme, /small sample/i);
  });

  it("grades each essay against the 7-criterion rubric out of 5, with the paper as data", () => {
    const input = ellipseGradingInput(essays[0]);
    assert.equal(ELLIPSE_RUBRIC.length, 7);
    assert.ok(input.criteria.every((criterion) => criterion.maxPoints === 5));
    assert.match(input.instructions, new RegExp(`"${essays[0].prompt}"`));
    assert.ok(buildGradingUserMessage(input).includes(`<student_paper>\n${essays[0].text}`));
  });
});

describe("committed evaluation results", () => {
  it("demo.json is labelled demo and its summary matches its own pairs", () => {
    const results = readJson<EvalResults>("eval", "results", "demo.json");
    assert.equal(results.run.grader, "demo");
    assert.equal(results.run.model, null);
    assert.match(results.run.label, /^Demo grader: .*not AI/);
    assert.equal(results.run.calls, 0);
    assert.equal(results.dataset.essays, 30);
    assert.equal(results.pairs.length, 30 * 7);
    assert.deepEqual(results.summary, summarize(results.pairs, ELLIPSE_CRITERION_IDS));
    assert.deepEqual(results.baseline, summarize(constantBaseline(results.pairs, 3), ELLIPSE_CRITERION_IDS));
  });

  it("live.json is either the not-run note or a real Claude run whose summary matches its pairs", () => {
    const results = readJson<EvalResults | NoEvalRun>("eval", "results", "live.json");
    if (results.run === null) {
      assert.match((results as NoEvalRun).note, /No live evaluation has been run yet/);
      return;
    }
    const live = results as EvalResults;
    assert.equal(live.run.grader, "claude");
    assert.ok(live.run.model);
    assert.ok(live.run.calls + live.run.cachedResults > 0, "a live result came from real API calls");
    assert.deepEqual(live.summary, summarize(live.pairs, ELLIPSE_CRITERION_IDS));
  });
});

describe("the evidence page", () => {
  const page = readFileSync(join(ROOT, "src", "app", "evidence", "page.tsx"), "utf8");

  it("reads every number from the committed results files instead of typing one in", () => {
    assert.match(page, /from "\.\.\/\.\.\/\.\.\/eval\/results\/demo\.json"/);
    assert.match(page, /from "\.\.\/\.\.\/\.\.\/eval\/results\/live\.json"/);
    assert.doesNotMatch(page, /\b\d{1,3}%/, "no hard-coded percentage");
  });

  it("states the sample size, labels the demo grader as not AI, and claims no AI accuracy before a live run", () => {
    assert.match(page, /This is a small sample\./);
    assert.match(page, /Not AI: a keyword heuristic/);
    assert.match(page, /Markwise makes no accuracy claim for its AI grading/);
  });
});
