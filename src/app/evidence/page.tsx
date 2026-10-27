import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";

import { CloudCheck, FlaskConical, TriangleAlert } from "@/components/icons";
import { REPO_URL } from "@/components/landing/comparison-data";
import { ExternalAnchor } from "@/components/landing/external-anchor";
import { LandingContainer } from "@/components/landing/section-intro";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { getCurrentUser } from "@/lib/auth/session";
import { demoLoginEnabled } from "@/lib/constants";
import type { EvalResults, NoEvalRun } from "@/lib/eval/ellipse";
import {
  baselineVerdict,
  formatPointsDiff,
  formatRate,
  type EvalSummary,
} from "@/lib/eval/metrics";

import demoJson from "../../../eval/results/demo.json";
import liveJson from "../../../eval/results/live.json";

export const metadata: Metadata = {
  title: "Evidence",
  description:
    "How close Markwise's first-pass scores are to human scores on 30 public essays, with the sample size and the weak spots shown plainly.",
};

// Results files written by `npm run eval` (eval/README.md), committed to the repo.
const DEMO = demoJson as unknown as EvalResults;
const LIVE = liveJson as unknown as EvalResults | NoEvalRun;

const EVAL_README_URL = `${REPO_URL}/blob/main/eval/README.md`;
const DATA_README_URL = `${REPO_URL}/blob/main/eval/data/README.md`;
const SAMPLE_URL = `${REPO_URL}/blob/main/eval/data/ellipse-sample.json`;
const RESULTS_URL = `${REPO_URL}/tree/main/eval/results`;

const H2 =
  "text-[1.5rem] leading-[1.25] font-medium tracking-[-0.01em] text-balance text-foreground sm:text-[1.75rem]";
const BODY = "max-w-[65ch] text-base leading-7 text-pretty text-muted-foreground";

async function signedInHref(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    return user ? (user.role === "TEACHER" ? "/dashboard" : "/student") : null;
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

/**
 * The evidence page: Markwise's scores next to human scores on a small public
 * set, read from the committed results files. Every number here comes from a
 * run of `npm run eval`. The sample size is stated next to the numbers, and
 * the demo grader is labelled as the heuristic it is.
 */
export default async function EvidencePage() {
  const appHref = await signedInHref();
  const demoLogin = demoLoginEnabled();
  const live = LIVE.run === null ? null : (LIVE as EvalResults);
  const runs = live ? [live, DEMO] : [DEMO];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader appHref={appHref} demoLogin={demoLogin} sectionBase="/" />
      <main id="main" className="flex-1">
        <LandingContainer className="py-12 sm:py-16">
          <div className="max-w-3xl">
            <p className="text-[0.875rem] font-medium text-primary">Evidence</p>
            <h1 className="mt-2 text-[2rem] leading-[1.15] font-medium tracking-[-0.02em] text-balance text-foreground sm:text-[2.75rem]">
              How close are Markwise&apos;s scores to a human&apos;s?
            </h1>
            <p className={`mt-5 ${BODY} sm:text-[1.0625rem] sm:leading-8`}>
              We graded {DEMO.dataset.essays} essays from a public research corpus and compared every score with the
              human raters&apos;. Each essay has {DEMO.criteria.length} criteria, so each run is{" "}
              {DEMO.summary.pairs} scores. The numbers below come straight from the committed results files.
            </p>
          </div>

          <div
            role="note"
            className="mt-8 flex max-w-3xl gap-3 rounded-2xl bg-warning-soft p-4 text-warning-soft-foreground sm:p-5"
          >
            <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p className="text-[0.9375rem] leading-6 text-pretty">
              <span className="font-medium">This is a small sample.</span> With {DEMO.dataset.essays} essays, one essay
              more or less moves a rate by about 3 points. Read these numbers as a rough check, not a measured
              accuracy.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {live ? <RunCard results={live} /> : <LiveNotRun />}
            <RunCard results={DEMO} />
          </div>

          {runs.map((results) => (
            <section key={results.run.grader} aria-labelledby={`criteria-${results.run.grader}`} className="mt-16">
              <h2 id={`criteria-${results.run.grader}`} className={H2}>
                By criterion: {runName(results)}
              </h2>
              <p className={`mt-3 ${BODY}`}>
                Each criterion is scored 1 to 5 in half points. The last column is a baseline that always answers 3,
                the most common human score. A grader with a higher error than it isn&apos;t adding information.
              </p>
              <CriteriaTable results={results} />
            </section>
          ))}

          {runs.map((results) => (
            <section key={results.run.grader} aria-labelledby={`largest-${results.run.grader}`} className="mt-16">
              <h2 id={`largest-${results.run.grader}`} className={H2}>
                Largest disagreements: {runName(results)}
              </h2>
              <p className={`mt-3 ${BODY}`}>
                Essay ids are the corpus&apos;s own, so anyone can look an essay up in the{" "}
                <ExternalAnchor href={SAMPLE_URL}>sample file</ExternalAnchor>.
              </p>
              <DisagreementsTable results={results} />
            </section>
          ))}

          <section aria-labelledby="limits-heading" className="mt-16 grid gap-8 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <h2 id="limits-heading" className={H2}>
                What this does and doesn&apos;t show
              </h2>
            </div>
            <dl className="grid gap-x-10 sm:grid-cols-2 lg:col-span-8">
              {LIMITS.map((item) => (
                <div key={item.title} className="border-t border-border py-5">
                  <dt className="text-base font-medium text-foreground">{item.title}</dt>
                  <dd className="mt-1.5 max-w-[60ch] text-[0.9375rem] leading-6 text-pretty text-muted-foreground">
                    {item.body}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="data-heading" className="mt-16 rounded-2xl bg-secondary p-6 sm:p-8">
            <h2 id="data-heading" className={H2}>
              The data and how to rerun it
            </h2>
            <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:gap-12">
              <div className="space-y-4 text-[0.9375rem] leading-6 text-pretty text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Source.</span> The{" "}
                  <ExternalAnchor href={DEMO.dataset.source}>ELLIPSE corpus</ExternalAnchor> of essays by English
                  language learners in grades 8 to 12. The corpus authors anonymized it, and each essay is scored by
                  two trained raters on six analytic qualities plus an overall score. Crossley et al. (2023),{" "}
                  <i>International Journal of Learner Corpus Research</i> 9(2).
                </p>
                <p>
                  <span className="font-medium text-foreground">License.</span> {DEMO.dataset.license}. The sample is
                  used for non-commercial evaluation and is shared under the same license.
                </p>
                <p>
                  <span className="font-medium text-foreground">Sample.</span> Five essays from each of six bands of
                  the human overall score, picked by a fixed hash so anyone can rebuild it. Only the id, prompt, text
                  and scores are kept. No demographics.
                </p>
              </div>
              <div className="space-y-4 text-[0.9375rem] leading-6 text-pretty text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Free run.</span>{" "}
                  <code className="rounded bg-card px-1.5 py-0.5 text-[0.875rem] text-foreground">npm run eval</code>{" "}
                  grades the sample with the demo grader, offline.
                </p>
                <p>
                  <span className="font-medium text-foreground">Live run.</span> Claude grades each essay with the
                  app&apos;s own prompt and validation. With the default model, claude-haiku-5-5, that is 30 API calls
                  and at most about $0.13. It is started by hand only, after a dry run prints the model, the call count
                  and the worst-case cost, and it stops at hard caps.
                </p>
                <p>
                  Details: <ExternalAnchor href={EVAL_README_URL}>eval/README.md</ExternalAnchor>,{" "}
                  <ExternalAnchor href={DATA_README_URL}>the sample&apos;s README</ExternalAnchor>, and the{" "}
                  <ExternalAnchor href={RESULTS_URL}>results files</ExternalAnchor>.
                </p>
              </div>
            </div>
          </section>
        </LandingContainer>
      </main>
      <SiteFooter sectionBase="/" />
    </div>
  );
}

const LIMITS: { title: string; body: string }[] = [
  {
    title: "Language, not argument",
    body: "ELLIPSE scores language proficiency: grammar, vocabulary, cohesion and the like. It says how well a grader judges those, not how it would grade a teacher's own rubric on content or argument.",
  },
  {
    title: "Typed essays only",
    body: "Handwriting, answer-key photos and test questions are not part of this check.",
  },
  {
    title: "Not the safety checks",
    body: "How often the injection flag fires, or how often a quote is wrong or weak, is not measured here. Those checks are covered by tests, not by a rate.",
  },
  {
    title: "Confidence is not checked",
    body: "The grader's self-reported confidence is not compared with its errors. It stays uncalibrated and only sorts To review.",
  },
];

function runName(results: EvalResults): string {
  return results.run.grader === "demo" ? "demo grader" : `Claude (${results.run.model})`;
}

function verdictSentence(results: EvalResults): string {
  switch (baselineVerdict(results.summary, results.baseline)) {
    case "beats":
      return "Its average error is lower than always answering 3.";
    case "matches":
      return "Its average error is about the same as always answering 3.";
    case "trails":
      return "Its average error is higher than always answering 3: on this sample it adds no information.";
    default:
      return "It gave no usable scores.";
  }
}

function RunCard({ results }: { results: EvalResults }) {
  const { run, summary, baseline } = results;
  const demo = run.grader === "demo";
  const Icon = demo ? FlaskConical : CloudCheck;
  return (
    <section aria-labelledby={`run-${run.grader}`} className="rounded-2xl border border-border bg-card p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`run-${run.grader}`} className="text-[1.25rem] leading-snug font-medium text-foreground">
          {demo ? "Demo grader" : `Claude (${run.model})`}
        </h2>
        <span
          className={
            demo
              ? "inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground"
              : "inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground"
          }
        >
          <Icon className="size-4" aria-hidden />
          {demo ? "Not AI: a keyword heuristic" : "Live AI run"}
        </span>
      </div>
      <p className="mt-2 text-[0.875rem] leading-6 text-pretty text-muted-foreground">
        {demo
          ? "The engine Markwise runs without an API key. "
          : `Effort ${run.effort ?? "default"}, with the app's own prompt and validation. `}
        Run {formatDate(run.ranAt)} on {summary.essays} essays, {summary.scored} of {summary.pairs} scores given.
        {demo
          ? " No API calls."
          : ` ${run.calls} API calls, about $${run.estimatedCostUsd.toFixed(2)} (estimate from list prices).`}
      </p>

      <dl className="mt-6 grid grid-cols-3 gap-3">
        <StatTile label="Within 1 point" value={formatRate(summary.within1)} baseline={formatRate(baseline.within1)} />
        <StatTile label="Exact match" value={formatRate(summary.exact)} baseline={formatRate(baseline.exact)} />
        <StatTile
          label="Average error"
          value={formatPointsDiff(summary.mae)}
          unit="pts"
          baseline={formatPointsDiff(baseline.mae)}
        />
      </dl>
      <p className="mt-5 text-[0.9375rem] leading-6 text-pretty text-foreground">{verdictSentence(results)}</p>
    </section>
  );
}

function StatTile({ label, value, unit, baseline }: { label: string; value: string; unit?: string; baseline: string }) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl bg-secondary px-3 py-3 sm:px-4">
      <dt className="text-[0.8125rem] leading-5 text-muted-foreground">{label}</dt>
      <dd className="order-first text-[1.75rem] leading-9 font-medium tracking-[-0.01em] text-foreground sm:text-[2rem] sm:leading-10">
        {value}
        {unit ? <span className="ml-1 text-[0.875rem] font-normal text-muted-foreground">{unit}</span> : null}
      </dd>
      <dd className="mt-1 text-[0.8125rem] leading-5 text-muted-foreground">Always 3: {baseline}</dd>
    </div>
  );
}

function LiveNotRun() {
  return (
    <section
      aria-labelledby="run-live"
      className="flex flex-col rounded-2xl border border-dashed border-border bg-card p-6 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="run-live" className="text-[1.25rem] leading-snug font-medium text-foreground">
          Claude (claude-haiku-5-5)
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Not run yet
        </span>
      </div>
      <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-6 text-pretty text-muted-foreground">
        No live run has been recorded, so there are no AI numbers to show. A live run costs money, so it is started by
        hand: 30 API calls to claude-haiku-5-5, at most about $0.13. Its results will replace this card.
      </p>
      <p className="mt-auto pt-6 text-[0.875rem] leading-6 text-muted-foreground">
        Until then, Markwise makes no accuracy claim for its AI grading.
      </p>
    </section>
  );
}

function CriteriaTable({ results }: { results: EvalResults }) {
  const { summary, baseline, criteria } = results;
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[34rem] text-left text-[0.9375rem]">
        <caption className="sr-only">
          Agreement with human scores by criterion, {runName(results)}, {summary.essays} essays
        </caption>
        <thead className="border-b border-border text-[0.8125rem] text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Criterion
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Within 1
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Exact
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Average error
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Always 3: error
            </th>
          </tr>
        </thead>
        <tbody className="tabular">
          {summary.perCriterion.map((row, index) => (
            <tr key={row.criterion} className="border-b border-border last:border-0">
              <th scope="row" className="px-4 py-3 font-medium text-foreground">
                {criteria.find((criterion) => criterion.id === row.criterion)?.title ?? row.criterion}
              </th>
              <td className="px-4 py-3 text-right">{formatRate(row.within1)}</td>
              <td className="px-4 py-3 text-right">{formatRate(row.exact)}</td>
              <td className="px-4 py-3 text-right">{formatPointsDiff(row.mae)}</td>
              <td className="px-4 py-3 text-right text-muted-foreground">
                {formatPointsDiff(baseline.perCriterion[index]?.mae ?? null)}
              </td>
            </tr>
          ))}
          <tr className="bg-secondary/60">
            <th scope="row" className="px-4 py-3 font-medium text-foreground">
              All criteria
            </th>
            <td className="px-4 py-3 text-right font-medium">{formatRate(summary.within1)}</td>
            <td className="px-4 py-3 text-right font-medium">{formatRate(summary.exact)}</td>
            <td className="px-4 py-3 text-right font-medium">{formatPointsDiff(summary.mae)}</td>
            <td className="px-4 py-3 text-right text-muted-foreground">{formatPointsDiff(baseline.mae)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DisagreementsTable({ results }: { results: EvalResults }) {
  const largest: EvalSummary["largest"] = results.summary.largest;
  const title = (id: string) => results.criteria.find((criterion) => criterion.id === id)?.title ?? id;
  if (largest.length === 0) {
    return <p className={`mt-6 ${BODY}`}>Every score was within a quarter point of the human one.</p>;
  }
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[34rem] text-left text-[0.9375rem]">
        <caption className="sr-only">The largest differences from the human score, {runName(results)}</caption>
        <thead className="border-b border-border text-[0.8125rem] text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Essay
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Criterion
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Human
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {results.run.grader === "demo" ? "Demo grader" : "Claude"}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Difference
            </th>
          </tr>
        </thead>
        <tbody className="tabular">
          {largest.map((pair) => (
            <tr key={`${pair.essayId}-${pair.criterion}`} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-mono text-[0.8125rem] text-foreground">{pair.essayId}</td>
              <td className="px-4 py-3 text-foreground">{title(pair.criterion)}</td>
              <td className="px-4 py-3 text-right">{pair.human}</td>
              <td className="px-4 py-3 text-right">{pair.model}</td>
              <td className="px-4 py-3 text-right font-medium text-foreground">
                {pair.difference > 0 ? "+" : "−"}
                {Math.abs(pair.difference)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}
