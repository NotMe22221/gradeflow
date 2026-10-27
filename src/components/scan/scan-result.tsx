"use client";

import Link from "next/link";
import { ArrowRight, CircleCheck, RotateCcw, ScrollText, ShieldCheck, TriangleAlert } from "@/components/icons";

import { ConfidenceBadge } from "@/components/grading/confidence-badge";
import { GraderBadge } from "@/components/grading/grader-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GRADER_LABELS } from "@/lib/constants";
import { formatPoints, pluralize } from "@/lib/format";
import type { ScanGradeSuccess, TranscriptionSource } from "@/lib/scan/types";

const SOURCE_NOTE: Record<TranscriptionSource, (result: Pick<ScanGradeSuccess, "grader">) => string> = {
  vision: (result) => `Transcribed by ${GRADER_LABELS[result.grader]}. Check it against the photo in To review.`,
  sample: () => "Stored transcription of the sample photo (demo scanner).",
  typed: () => "Your typed transcription (demo scanner).",
};

const MAX_FLAGS_SHOWN = 3;

export function reviewHref(result: Pick<ScanGradeSuccess, "assignmentId" | "submissionId">): string {
  const params = new URLSearchParams({ assignment: result.assignmentId, s: result.submissionId });
  return `/review?${params.toString()}`;
}

/**
 * The graded draft, waiting in To review. Nothing here is published: the
 * score is a suggestion, named as one, until the teacher approves it.
 */
export function ScanResult({ result, onScanAnother }: { result: ScanGradeSuccess; onScanAnother: () => void }) {
  const moreLines = result.transcriptionLineCount - result.transcriptionPreview.length;
  const hiddenFlags = result.flags.length - MAX_FLAGS_SHOWN;

  return (
    <Card aria-labelledby="scan-result-title" className="min-w-0">
      <div className="flex items-start gap-3 px-4 pt-5 sm:px-6 sm:pt-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground">
          <CircleCheck className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 space-y-0.5">
          <h2 id="scan-result-title" className="text-lg leading-7 font-medium text-foreground">
            Draft ready in To review
          </h2>
          <p className="text-sm text-pretty text-muted-foreground">
            {result.studentName} · {result.assignmentTitle}
          </p>
        </div>
      </div>

      <div className="space-y-5 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <GraderBadge grader={result.grader} model={result.model} />
          <ConfidenceBadge confidence={result.confidence} demo={result.grader === "demo"} />
          {result.flagCount > 0 ? (
            <Badge variant="warning">
              <TriangleAlert aria-hidden />
              {pluralize(result.flagCount, "flag")}
            </Badge>
          ) : (
            <Badge variant="success">No flags</Badge>
          )}
        </div>

        {/* Classroom-style counts. Values sit on one baseline even when a label wraps. */}
        <dl className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border">
          <div className="flex min-w-0 flex-col-reverse justify-end gap-0.5 px-3 py-3 sm:px-4">
            <dt className="text-xs text-muted-foreground">Suggested score</dt>
            <dd className="tabular truncate font-display text-xl font-medium text-foreground">
              {result.draftScore === null ? (
                "None"
              ) : (
                <>
                  {formatPoints(result.draftScore)}
                  <span className="text-sm text-muted-foreground">/{formatPoints(result.maxScore)}</span>
                </>
              )}
            </dd>
          </div>
          <div className="flex min-w-0 flex-col-reverse justify-end gap-0.5 px-3 py-3 sm:px-4">
            <dt className="text-xs text-muted-foreground">Pages</dt>
            <dd className="tabular font-display text-xl font-medium text-foreground">{result.pageCount}</dd>
          </div>
          <div className="flex min-w-0 flex-col-reverse justify-end gap-0.5 px-3 py-3 sm:px-4">
            <dt className="text-xs text-muted-foreground">Need your score</dt>
            <dd className="tabular font-display text-xl font-medium text-foreground">{result.unscoredCount}</dd>
          </div>
        </dl>

        <figure className="space-y-2">
          <figcaption className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ScrollText className="size-3.5" aria-hidden />
            Transcription
          </figcaption>
          <div className="rounded-xl bg-secondary px-4 py-3">
            <ul className="space-y-1 text-sm leading-relaxed text-foreground">
              {result.transcriptionPreview.map((line, index) => (
                <li key={index} className="break-words">
                  {line}
                </li>
              ))}
            </ul>
            {moreLines > 0 ? (
              <p className="tabular mt-2 text-xs text-muted-foreground">+ {pluralize(moreLines, "more line")}</p>
            ) : null}
          </div>
          <p className="text-xs text-pretty text-muted-foreground">{SOURCE_NOTE[result.transcriptionSource](result)}</p>
        </figure>

        {result.flags.length > 0 ? (
          <ul className="space-y-2" aria-label="Flags for your review">
            {result.flags.slice(0, MAX_FLAGS_SHOWN).map((flag, index) => (
              <li
                key={index}
                className="flex items-start gap-2 rounded-xl bg-warning-soft px-3.5 py-2.5 text-[0.8125rem] text-pretty text-warning-soft-foreground"
              >
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span className="min-w-0">{flag}</span>
              </li>
            ))}
            {hiddenFlags > 0 ? (
              <li className="tabular px-1 text-xs text-muted-foreground">
                + {pluralize(hiddenFlags, "more flag")} in To review
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-border px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="w-full sm:flex-1">
            <Link href={reviewHref(result)}>
              Review now
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button type="button" variant="outline" className="w-full sm:flex-1" onClick={onScanAnother}>
            <RotateCcw aria-hidden />
            Scan another
          </Button>
        </div>
        <p className="flex items-start gap-2 text-[0.8125rem] text-pretty text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
          The draft is in To review. Nothing publishes until you approve and return it.
        </p>
      </div>
    </Card>
  );
}
