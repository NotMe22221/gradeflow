import Link from "next/link";

import { Cloud, FlaskConical, History, Info, ListChecks } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GRADER_LABELS, type GraderKind } from "@/lib/constants";
import { formatPointsDiff, formatRate } from "@/lib/eval/metrics";
import { pluralize } from "@/lib/format";
import { changeLabel, type AiAgreement, type CriterionAgreement } from "@/lib/review/agreement";
import { OVERRIDE_MIN_CHANGE, OVERRIDE_MIN_PAPERS, OVERRIDE_MIN_SHARE } from "@/lib/review/recheck";
import { cn } from "@/lib/utils";

const PAD = "px-4 md:px-6";

/** "half", or a percentage if the rule ever changes. */
const OFTEN_SHARE = OVERRIDE_MIN_SHARE === 0.5 ? "half" : `${Math.round(OVERRIDE_MIN_SHARE * 100)}%`;

function graderName(grader: GraderKind): string {
  return grader === "demo" ? "the demo grader" : GRADER_LABELS[grader];
}

/** Which engine drafted the compared papers. The demo grader is never presented as AI. */
function GraderChip({ grader }: { grader: GraderKind }) {
  if (grader === "demo") {
    return (
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <FlaskConical className="size-4 shrink-0" aria-hidden />
        Demo grader: a keyword heuristic, not AI
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground">
      <Cloud className="size-4 shrink-0" aria-hidden />
      Drafts by {GRADER_LABELS[grader]}
    </span>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl bg-secondary px-3 py-2.5">
      <dt className="text-[0.8125rem] leading-5 text-muted-foreground">{label}</dt>
      <dd className="tabular order-first font-display text-[1.5rem] leading-8 font-extrabold tracking-[-0.02em] text-foreground">
        {value}
        {unit ? (
          <span className="ml-1 font-sans text-[0.8125rem] font-normal tracking-normal text-muted-foreground">{unit}</span>
        ) : null}
      </dd>
    </div>
  );
}

function RecheckFooter({ count, assignmentId }: { count: number; assignmentId: string }) {
  if (count <= 0) return null;
  return (
    <div className={cn("flex flex-col gap-3 border-t border-border py-4 sm:flex-row sm:items-center sm:justify-between", PAD)}>
      <p className="text-sm text-pretty text-foreground">
        {pluralize(count, "draft")} of this assignment in To review {count === 1 ? "is" : "are"} worth rechecking.
      </p>
      <Button asChild variant="tonal" size="sm" className="self-start sm:self-auto">
        <Link href={`/review?assignment=${encodeURIComponent(assignmentId)}&sort=recheck`}>
          <ListChecks aria-hidden />
          Open the drafts worth rechecking
        </Link>
      </Button>
    </div>
  );
}

function CriterionRow({ criterion }: { criterion: CriterionAgreement }) {
  const override = criterion.override;
  return (
    <tr>
      <th scope="row" className={cn("py-cell pr-3 text-left align-top font-normal", "pl-4 md:pl-6")}>
        <span className="block break-words text-foreground">{criterion.title}</span>
        {criterion.oftenChanged ? (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground">
            <History className="size-3.5 shrink-0" aria-hidden />
            Often changed
          </span>
        ) : null}
      </th>
      <td className="tabular py-cell pr-3 text-right align-top whitespace-nowrap text-foreground">
        {override ? (
          `${override.changed} of ${override.papers}`
        ) : (
          <Dash label={criterion.pairs > 0 ? "The AI gave no usable score" : "No approved scores yet"} />
        )}
      </td>
      <td className="tabular py-cell pr-4 text-right align-top whitespace-nowrap text-muted-foreground md:pr-6">
        {override && override.changed > 0 ? changeLabel(override.meanChange) : "–"}
      </td>
    </tr>
  );
}

/** A dash on screen, and why for screen readers. */
function Dash({ label }: { label: string }) {
  return (
    <>
      <span aria-hidden>–</span>
      <span className="sr-only">{label}</span>
    </>
  );
}

/**
 * "AI vs your grades": the AI's stored draft scores next to the scores the
 * teacher approved on this assignment (lib/review/agreement.ts). Teacher only.
 * Shows the sample size every time, calls a sample under 30 papers small, and
 * labels the demo grader as the heuristic it is. With no approved AI drafts
 * yet it shows a short hint while drafts wait in To review, else nothing.
 */
export function AiAgreementCard({
  assignmentId,
  agreement,
  queued,
  worthRechecking,
  isTest = false,
}: {
  assignmentId: string;
  agreement: AiAgreement | null;
  /** Drafts of this assignment waiting in To review. */
  queued: number;
  /** Of those, the ones worth rechecking. */
  worthRechecking: number;
  isTest?: boolean;
}) {
  if (!agreement && queued <= 0) return null;

  const heading = (
    <h2 id="ai-agreement-heading" className="text-base font-semibold text-foreground">
      AI vs your grades
    </h2>
  );

  if (!agreement) {
    return (
      <Card role="region" aria-labelledby="ai-agreement-heading" className="min-w-0 overflow-hidden">
        <div className={cn("space-y-1 py-4", PAD)}>
          {heading}
          <p className="max-w-[70ch] text-sm text-pretty text-muted-foreground">
            No approved papers with an AI draft yet. Once you approve some, this compares the AI&apos;s draft scores
            with yours, {isTest ? "question by question" : "criterion by criterion"}.
          </p>
        </div>
        <RecheckFooter count={worthRechecking} assignmentId={assignmentId} />
      </Card>
    );
  }

  const { grader, papers } = agreement;
  const demo = grader === "demo";
  const unscored = agreement.pairs - agreement.scored;
  const leftOut = agreement.leftOut
    .map((other) => `${pluralize(other.papers, "paper")} drafted by ${graderName(other.grader)}`)
    .join(" and ");

  return (
    <Card role="region" aria-labelledby="ai-agreement-heading" className="min-w-0 overflow-hidden">
      <div className={cn("flex flex-col gap-3 pt-4 sm:flex-row sm:items-start sm:justify-between", PAD)}>
        <div className="min-w-0 space-y-1">
          {heading}
          <p className="max-w-[70ch] text-sm text-pretty text-muted-foreground">
            The {demo ? "demo grader's" : "AI's"} draft scores next to the scores you approved on this{" "}
            {isTest ? "test" : "assignment"}.
          </p>
        </div>
        <GraderChip grader={grader} />
      </div>

      <dl className={cn("mt-4 grid grid-cols-2 gap-2 @2xl:grid-cols-4", PAD)}>
        <Stat label={papers === 1 ? "Paper" : "Papers"} value={String(papers)} />
        <Stat label="Exact match" value={formatRate(agreement.exact)} />
        <Stat label="Within 1 point" value={formatRate(agreement.within1)} />
        <Stat label="Mean difference" value={formatPointsDiff(agreement.meanDifference)} unit="pts" />
      </dl>

      <div className={cn("mt-4 space-y-1.5 text-sm text-pretty text-muted-foreground", PAD)}>
        <p className="flex gap-2">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {agreement.smallSample ? (
              <>
                <span className="font-medium text-foreground">A small sample: {pluralize(papers, "paper")}.</span>{" "}
                Read it as a rough check, not a measured accuracy.
              </>
            ) : (
              <>
                Based on {pluralize(papers, "approved paper")}. A check on your own grading, not a measured
                accuracy.
              </>
            )}{" "}
            {demo
              ? "The demo grader runs when no API key is set, so these numbers say nothing about AI grading."
              : null}
          </span>
        </p>
        {leftOut ? (
          <p className="pl-6">
            Only {graderName(grader)}&apos;s drafts are counted; {leftOut}{" "}
            {agreement.leftOut.length === 1 && agreement.leftOut[0]?.papers === 1 ? "is" : "are"} left out.
          </p>
        ) : null}
        {unscored > 0 ? (
          <p className="pl-6">
            The {demo ? "demo grader" : "AI"} gave no usable score for {unscored} of {agreement.pairs}{" "}
            {isTest ? "answers" : "criterion scores"}; the rates leave {unscored === 1 ? "it" : "them"} out.
          </p>
        ) : null}
      </div>

      <div className="mt-4 border-t border-border">
        <table className="w-full text-sm">
          <caption className="sr-only">
            How often you changed {graderName(grader)}&apos;s score, by {isTest ? "question" : "criterion"}, on{" "}
            {pluralize(papers, "approved paper")}
          </caption>
          <thead className="text-[0.8125rem] text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="h-cell-head pr-3 pl-4 text-left font-medium md:pl-6">
                {isTest ? "Question" : "Criterion"}
              </th>
              <th scope="col" className="h-cell-head w-[5.5rem] py-1 pr-3 text-right font-medium sm:w-auto sm:whitespace-nowrap">
                <span className="sm:hidden">Changed</span>
                <span className="hidden sm:inline">You changed it</span>
              </th>
              <th
                scope="col"
                className="h-cell-head w-[5.5rem] py-1 pr-4 text-right font-medium sm:w-auto sm:whitespace-nowrap md:pr-6"
              >
                Average change
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {agreement.criteria.map((criterion) => (
              <CriterionRow key={criterion.id} criterion={criterion} />
            ))}
          </tbody>
        </table>
        <p className={cn("border-t border-border py-3 text-[0.8125rem] text-pretty text-muted-foreground", PAD)}>
          A change under {pluralize(OVERRIDE_MIN_CHANGE, "point")} counts as fine-tuning. &ldquo;Often changed&rdquo;
          means on {OFTEN_SHARE} or more of at least {OVERRIDE_MIN_PAPERS} papers; To review then marks that score worth
          rechecking.
        </p>
      </div>

      <RecheckFooter count={worthRechecking} assignmentId={assignmentId} />
    </Card>
  );
}
