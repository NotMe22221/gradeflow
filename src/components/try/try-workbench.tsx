"use client";

import { useId, useMemo, useRef, useState } from "react";

import { CircleAlert, CircleCheck, CloudCheck, Flag, FlaskConical, TriangleAlert } from "@/components/icons";
import { ConfidenceBadge } from "@/components/grading/confidence-badge";
import { GraderBadge } from "@/components/grading/grader-badge";
import { FLAG_FILL, FLAG_INK, FLAG_RING, MARK_CHIP, SHEET, SHEET_SCOPE } from "@/components/review/paper-sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TemplateId } from "@/lib/demo/templates";
import { formatPoints, pluralize } from "@/lib/format";
import { describeFlag } from "@/lib/grading/flags";
import { detectPromptInjection } from "@/lib/grading/injection";
import { layoutEvidence, type InlineSegment } from "@/lib/review/model";
import type { TryItAllowance, TryItResult } from "@/lib/try/types";
import { cn } from "@/lib/utils";

export type TryTemplate = { id: TemplateId; name: string; title: string; criteria: number; points: number };
export type TrySample = { label: string; content: string };

type Response = { ok: true; result: TryItResult; allowance: TryItAllowance } | { ok: false; error?: string; code?: string };

/**
 * The try-it sandbox: paste a paper, pick a rubric, see the first pass with
 * its quotes highlighted. The engine (live Claude or the demo grader) and the
 * live-call allowance are always on screen.
 */
export function TryWorkbench({
  templates,
  samples,
  maxChars,
  initialResult,
  initialAllowance,
}: {
  templates: TryTemplate[];
  samples: Record<TemplateId, TrySample[]>;
  maxChars: number;
  initialResult: TryItResult | null;
  initialAllowance: TryItAllowance;
}) {
  const [templateId, setTemplateId] = useState<TemplateId>(initialResult?.templateId ?? templates[0].id);
  const [paper, setPaper] = useState(initialResult?.paper ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TryItResult | null>(initialResult);
  const [allowance, setAllowance] = useState(initialAllowance);
  const resultRef = useRef<HTMLElement>(null);
  const paperId = useId();
  const errorId = useId();
  const rubricLabelId = useId();

  const live = allowance.engine.kind === "claude";
  const outOfTries = live && allowance.remaining === 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    let body: Response | null = null;
    try {
      const response = await fetch("/api/try", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ templateId, paper }),
        cache: "no-store",
      });
      body = (await response.json().catch(() => null)) as Response | null;
    } catch {
      body = { ok: false, error: "Network error. Check your connection and try again." };
    }
    setPending(false);
    if (body?.ok) {
      setResult(body.result);
      setAllowance(body.allowance);
      // Bring the result into view, then focus its heading for screen readers.
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        resultRef.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
      });
      return;
    }
    if (body?.code === "AI_LIMIT" && live) setAllowance((current) => ({ ...current, remaining: 0 }));
    setError(body?.error ?? "Grading failed. Try again.");
  }

  return (
    <div className="space-y-10">
      <EngineStrip allowance={allowance} />

      <form onSubmit={submit} className="space-y-6" aria-describedby={error ? errorId : undefined}>
        <fieldset>
          <legend id={rubricLabelId} className="text-[0.9375rem] font-medium text-foreground">
            Rubric
          </legend>
          <div role="radiogroup" aria-labelledby={rubricLabelId} className="mt-2 grid gap-2 sm:grid-cols-3">
            {templates.map((template) => {
              const checked = template.id === templateId;
              return (
                <label
                  key={template.id}
                  className={cn(
                    "flex cursor-pointer flex-col rounded-xl border px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    checked ? "border-primary bg-primary-soft/60" : "border-border bg-card hover:bg-foreground/[0.03]"
                  )}
                >
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={checked}
                    onChange={() => setTemplateId(template.id)}
                    className="sr-only"
                  />
                  <span className="text-[0.9375rem] font-medium text-foreground">{template.name}</span>
                  <span className="mt-0.5 text-[0.8125rem] text-muted-foreground">
                    {pluralize(template.criteria, "criterion", "criteria")} · {pluralize(template.points, "point")}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <Label htmlFor={paperId} className="text-[0.9375rem]">
              Paper
            </Label>
            <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[0.8125rem] text-muted-foreground">
              <span className="mr-1">Fill in a sample:</span>
              {samples[templateId].map((sample) => (
                <Button
                  key={sample.label}
                  type="button"
                  variant="text"
                  size="sm"
                  className="h-8 px-2.5"
                  onClick={() => {
                    setPaper(sample.content);
                    setError(null);
                  }}
                >
                  {sample.label}
                </Button>
              ))}
            </div>
          </div>
          <Textarea
            id={paperId}
            value={paper}
            onChange={(event) => setPaper(event.target.value)}
            maxLength={maxChars}
            rows={12}
            placeholder="Paste a short paper here. Made-up writing only: never real student work."
            aria-invalid={error ? true : undefined}
            className="min-h-64 text-[0.9375rem] leading-relaxed"
          />
          <p className="tabular text-right text-xs text-muted-foreground">
            {paper.length.toLocaleString("en-US")} / {maxChars.toLocaleString("en-US")}
          </p>
        </div>

        {error ? (
          <p id={errorId} role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-[0.9375rem] text-danger-soft-foreground">
            <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button type="submit" size="lg" disabled={pending || outOfTries || paper.trim().length === 0}>
            {pending ? "Grading…" : "Grade it"}
          </Button>
          <p className="text-[0.875rem] text-muted-foreground" aria-live="polite">
            {pending
              ? live
                ? "Claude is reading the paper. This usually takes under a minute."
                : "The demo grader is scoring the paper."
              : outOfTries
                ? "No live tries left for now. See the note above for when they come back."
                : null}
          </p>
        </div>
      </form>

      {result ? <ResultPanel ref={resultRef} result={result} /> : null}
    </div>
  );
}

/** Which engine grades, in words, and how many live tries are left. */
function EngineStrip({ allowance }: { allowance: TryItAllowance }) {
  const live = allowance.engine.kind === "claude";
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5",
        live ? "bg-primary-soft text-primary-soft-foreground" : "border border-dashed border-border bg-card"
      )}
    >
      {live ? <CloudCheck className="size-6 shrink-0" aria-hidden /> : <FlaskConical className="size-6 shrink-0 text-muted-foreground" aria-hidden />}
      <div className="min-w-0 space-y-1 text-[0.9375rem] leading-6 text-pretty">
        <p className="font-medium text-foreground">
          {live ? `Live AI: Claude (${allowance.engine.model})` : "Demo grader: a keyword heuristic, not AI"}
        </p>
        {live ? (
          <p>
            <span className="font-medium">
              {allowance.remaining === 0
                ? "No live tries left right now."
                : `${pluralize(allowance.remaining ?? 0, "live try", "live tries")} left.`}
            </span>{" "}
            Each visitor gets up to {allowance.perSessionPerHour} an hour ({allowance.perIpPerHour} per network), and
            the whole site {allowance.perDay} a day. Grading the same paper again shows the saved result for free.
          </p>
        ) : (
          <p className="text-muted-foreground">
            {allowance.killSwitch
              ? "Live AI is switched off on this server, so the demo grader runs instead. "
              : "No AI key is set on this server, so the demo grader runs instead. "}
            It is free and unlimited, but its scores and quotes are placeholders from simple text features, not real AI
            output.
          </p>
        )}
      </div>
    </div>
  );
}

function ResultPanel({ result, ref }: { result: TryItResult; ref: React.Ref<HTMLElement> }) {
  const demo = result.engine.kind === "demo";
  const flagged = useMemo(
    () => (result.flags.some((flag) => flag.code === "POSSIBLE_PROMPT_INJECTION") ? detectPromptInjection(result.paper).snippets : []),
    [result]
  );
  const layout = useMemo(
    () =>
      layoutEvidence(
        result.paper,
        result.criteria.map((criterion) => ({
          id: criterion.id,
          title: criterion.title,
          aiEvidence: criterion.evidence,
          evidenceFound: criterion.evidenceFound,
        })),
        flagged
      ),
    [result, flagged]
  );
  const flagLines = result.flags.map((flag) => describeFlag(flag, result.criteria));
  const expires = new Date(result.expiresAt);

  const renderInline = (segment: InlineSegment, key: number) =>
    segment.kind === "text" ? (
      <span key={key}>{segment.text}</span>
    ) : (
      <mark key={key} className="rounded-sm bg-highlight box-decoration-clone px-0.5 text-paper-foreground">
        <span className="sr-only">
          {`Quote for ${segment.criteria.map((ref) => `criterion ${ref.number}, ${ref.title}`).join(" and ")}: `}
        </span>
        {segment.criteria.map((ref) => (
          <span
            key={ref.id}
            aria-hidden
            title={ref.title}
            className={cn(
              "tabular mr-1 inline-flex h-4 min-w-4 -translate-y-px items-center justify-center rounded-full px-1 align-middle text-[0.625rem] leading-none font-semibold select-none",
              MARK_CHIP
            )}
          >
            {ref.number}
          </span>
        ))}
        {segment.text}
      </mark>
    );

  return (
    <section ref={ref} aria-labelledby="try-result-heading" className={cn("scroll-mt-24 space-y-6", SHEET_SCOPE)}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-t border-border pt-8">
        <div className="min-w-0">
          <h2
            id="try-result-heading"
            tabIndex={-1}
            className="text-[1.5rem] leading-tight font-medium text-foreground outline-none sm:text-[1.75rem]"
          >
            {demo ? "Demo first pass" : "First pass"}: {result.rubricName}
          </h2>
          <p className="mt-1 text-[0.875rem] text-pretty text-muted-foreground">
            {result.reused
              ? "You graded this same paper with this rubric before, so this is the saved result (no new call). "
              : null}
            Kept in your sandbox until {expires.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })},
            then deleted. Nothing here reaches a student: in Markwise, a teacher approves every grade first.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GraderBadge grader={result.engine.kind} model={result.engine.model} />
          <ConfidenceBadge confidence={result.confidence} demo={demo} />
          <span className="tabular rounded-full bg-secondary px-3 py-1 text-[0.9375rem] font-medium text-foreground">
            {result.total === null ? "–" : formatPoints(result.total)} / {formatPoints(result.maxTotal)}
            <span className="sr-only"> points{demo ? ", demo suggestion" : ", suggested"}</span>
          </span>
        </div>
      </div>

      {flagLines.length > 0 ? (
        <div role="note" className="rounded-xl bg-warning-soft p-4">
          <div className="flex gap-3">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-soft-foreground" aria-hidden />
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium text-warning-soft-foreground">What a teacher would be asked to check</p>
              <ul className="list-disc space-y-1.5 pl-4 text-[0.875rem] leading-relaxed break-words text-warning-soft-foreground marker:text-warning">
                {flagLines.map((line, index) => (
                  <li key={index}>
                    {line.criterionLabel ? <span className="font-medium">{line.criterionLabel}: </span> : null}
                    {line.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <article
          aria-label="Your paper, with the grader's quotes highlighted"
          className={cn("rounded-xl border border-border px-5 py-6 shadow-hover sm:px-8 sm:py-8", SHEET)}
        >
          <div className="max-w-prose text-base leading-7 break-words whitespace-pre-wrap">
            {layout.segments.map((segment, index) =>
              segment.kind === "flagged" ? (
                <mark
                  key={index}
                  className={cn("rounded-sm box-decoration-clone px-0.5 text-paper-foreground ring-1", FLAG_FILL, FLAG_RING)}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mr-1 inline-flex -translate-y-px items-center gap-1 rounded-sm px-1 align-middle text-[0.6875rem] leading-4 font-semibold whitespace-nowrap select-none",
                      FLAG_INK
                    )}
                  >
                    <Flag className="size-3" />
                    Addressed to the grader
                  </span>
                  <span className="sr-only">Flagged, addressed to the grader: </span>
                  {segment.children.map(renderInline)}
                </mark>
              ) : (
                renderInline(segment, index)
              )
            )}
          </div>
        </article>

        <ol className="space-y-4">
          {result.criteria.map((criterion, index) => (
            <li key={criterion.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[0.9375rem] leading-6 font-medium text-foreground">
                  <span className="text-muted-foreground">{index + 1}.</span> {criterion.title}
                </h3>
                <span className="tabular shrink-0 text-[0.9375rem] font-medium text-foreground">
                  {criterion.score === null ? "–" : formatPoints(criterion.score)} / {formatPoints(criterion.maxPoints)}
                </span>
              </div>
              {criterion.justification ? (
                <p className="mt-1.5 text-[0.875rem] leading-6 text-pretty text-muted-foreground">{criterion.justification}</p>
              ) : null}
              {criterion.evidence && layout.markForCriterion[criterion.id] !== undefined ? (
                <div className="mt-3 rounded-lg bg-secondary px-3 py-2.5">
                  <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-secondary-foreground">
                    <span
                      aria-hidden
                      className={cn(
                        "tabular inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] leading-none font-semibold",
                        MARK_CHIP,
                        "dark:bg-[color-mix(in_oklab,var(--warning)_78%,var(--paper))]"
                      )}
                    >
                      {index + 1}
                    </span>
                    <CircleCheck className="size-4 text-success" aria-hidden />
                    Found in the paper, word for word
                    {criterion.weak ? (
                      <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-warning-soft-foreground">
                        <TriangleAlert className="size-3.5" aria-hidden />
                        Weak match<span className="sr-only">: this quote may not support the criterion</span>
                      </span>
                    ) : null}
                  </p>
                  <q className="mt-1 block text-[0.875rem] leading-relaxed break-words text-foreground italic">
                    {criterion.evidence}
                  </q>
                </div>
              ) : (
                <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2.5 text-[0.8125rem] font-medium text-foreground">
                  <CircleAlert className="size-4 text-muted-foreground" aria-hidden />
                  No supporting quote found
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>

      {result.overallComment ? (
        <p className="max-w-[75ch] rounded-xl bg-secondary px-4 py-3 text-[0.9375rem] leading-relaxed text-pretty text-secondary-foreground">
          <span className="font-medium text-foreground">{demo ? "Demo overall comment" : "Overall comment"}: </span>
          {result.overallComment}
        </p>
      ) : null}
    </section>
  );
}
