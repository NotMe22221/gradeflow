# Evaluation

How close are Markwise's first-pass scores to human scores? This folder
answers that on a small, public, labelled set. The results are shown on the
site at `/evidence`.

- `data/ellipse-sample.json`: 30 essays by English language learners, each
  scored by human raters on 7 criteria. Source, license and how they were
  picked: [`data/README.md`](data/README.md).
- `results/demo.json`: the demo grader's run, committed.
- `results/live.json`: the latest live Claude run, committed. Until someone
  runs it, it says so.

## Running it

```bash
npm run eval                 # the demo grader: free, offline
npm run eval -- --live       # plans a live run: prints model, calls, worst-case cost; sends nothing
npm run eval -- --live --confirm-calls 30    # runs it (needs ANTHROPIC_API_KEY)
```

A live run grades each essay with the app's own grader. It uses the same
prompt, structured output and validation, and the default model
`claude-haiku-5-5` at effort `medium`. That is **30 API calls**. The worst
case is about **$0.13**, from list prices, with every call using its full
8,000-token output limit. A typical call uses a fraction of that. The run has
hard caps: `--max-calls` (default 30) and `--budget-usd` (default 0.50).
Results are cached in `eval/.cache/` (not committed) by paper, rubric, model
and prompt, so a rerun only pays for essays that failed or changed. No test
runs this script, and nothing runs it automatically.

## What it reports

For each criterion and overall:

- **Exact agreement:** the grader's score equals the human score. Both are in
  half points.
- **Within 1:** the scores differ by at most one point.
- **MAE:** the mean absolute difference, in points (the scale is 1 to 5).
- **The largest disagreements:** essay, criterion, both scores.
- **A baseline that always answers 3** (the most common human score), on the
  same essays. A grader that doesn't beat it isn't adding information.

The human scores are averages of two trained raters. The rubric descriptions
in `src/lib/eval/ellipse.ts` are short paraphrases of the corpus's six
analytic dimensions plus an overall score, not the corpus's own rubric text.

## How to read the numbers

- **The sample is small.** With 30 essays, one essay more or less moves a
  rate by about 3 points. Use the numbers to catch a grader that is badly off,
  not to compare two close ones.
- **The demo grader is not AI.** It is a keyword heuristic for running
  Markwise without an API key. Its numbers are expected to be poor, and they
  are: on this sample it does no better than always answering 3.
- **This rubric is not a classroom rubric.** ELLIPSE scores language
  proficiency (grammar, vocabulary, cohesion...), not argument or content.
  The numbers say how well a grader judges those qualities, not how it would
  grade a teacher's own assignment.
- **No accuracy claim** appears anywhere in Markwise except as a number from
  a committed results file here, shown with its sample size.
