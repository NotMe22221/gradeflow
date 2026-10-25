"use client";

import Link from "next/link";
import { ArrowRight, CircleCheck, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";

import { ConfidenceBadge } from "@/components/grading/confidence-badge";
import { GraderBadge } from "@/components/grading/grader-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPoints, pluralize } from "@/lib/format";
import type { ScanGradeSuccess, TranscriptionSource } from "@/lib/scan/types";

const SOURCE_NOTE: Record<TranscriptionSource, string> = {
  vision: "Transcribed by GPT-4o. Check it against the photo in the review queue.",
  sample: "Stored transcription of the sample photo (demo scanner).",
  typed: "Your typed transcription (demo scanner).",
};

const MAX_FLAGS_SHOWN = 3;

export function reviewHref(result: Pick<ScanGradeSuccess, "assignmentId" | "submissionId">): string {
  const params = new URLSearchParams({ assignment: result.assignmentId, s: result.submissionId });
  return `/review?${params.toString()}`;
}

/** The graded draft, waiting in the review queue. Nothing here is published. */
export function ScanResult({ result, onScanAnother }: { result: ScanGradeSuccess; onScanAnother: () => void }) {
  const moreLines = result.transcriptionLineCount - result.transcriptionPreview.length;
  const hiddenFlags = result.flags.length - MAX_FLAGS_SHOWN;

  return (
    <Card aria-labelledby="scan-result-title" className="min-w-0">
      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
            <CircleCheck className="size-4" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 id="scan-result-title" className="text-sm font-semibold text-foreground">
              Draft ready for review
            </h2>
            <p className="text-sm text-pretty text-muted-foreground">
              {result.studentName} · {result.assignmentTitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <GraderBadge grader={result.grader} model={result.model} />
          <ConfidenceBadge confidence={result.confidence} />
          {result.flagCount > 0 ? (
            <Badge variant="warning">
              <TriangleAlert aria-hidden />
              {pluralize(result.flagCount, "flag")}
            </Badge>
          ) : (
            <Badge variant="success">No flags</Badge>
          )}
        </div>

        {/* Values sit on one baseline even when a label wraps on a narrow screen. */}
        <dl className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border">
          <div className="flex min-w-0 flex-col justify-between gap-0.5 px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">AI draft</dt>
            <dd className="tabular truncate text-sm font-semibold text-foreground">
              {result.draftScore === null
                ? "No score"
                : `${formatPoints(result.draftScore)} / ${formatPoints(result.maxScore)}`}
            </dd>
          </div>
          <div className="flex min-w-0 flex-col justify-between gap-0.5 px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">Pages</dt>
            <dd className="tabular text-sm font-semibold text-foreground">{result.pageCount}</dd>
          </div>
          <div className="flex min-w-0 flex-col justify-between gap-0.5 px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">Needs your score</dt>
            <dd className="tabular text-sm font-semibold text-foreground">
              {result.unscoredCount === 0 ? "None" : pluralize(result.unscoredCount, "question")}
            </dd>
          </div>
        </dl>

        <figure className="space-y-2">
          <figcaption className="text-xs font-medium text-muted-foreground">Transcription</figcaption>
          <div className="rounded-lg border border-border bg-background px-4 py-3">
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
          <p className="text-xs text-pretty text-muted-foreground">{SOURCE_NOTE[result.transcriptionSource]}</p>
        </figure>

        {result.flags.length > 0 ? (
          <ul className="space-y-2" aria-label="Flags for your review">
            {result.flags.slice(0, MAX_FLAGS_SHOWN).map((flag, index) => (
              <li
                key={index}
                className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-[13px] text-pretty text-warning-soft-foreground"
              >
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span className="min-w-0">{flag}</span>
              </li>
            ))}
            {hiddenFlags > 0 ? (
              <li className="tabular px-1 text-xs text-muted-foreground">
                + {pluralize(hiddenFlags, "more flag")} in the review queue
              </li>
            ) : null}
          </ul>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:flex-1">
            <Link href={reviewHref(result)}>
              Review now
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button type="button" variant="outline" size="lg" className="w-full sm:flex-1" onClick={onScanAnother}>
            <RotateCcw aria-hidden />
            Scan another
          </Button>
        </div>

        <p className="flex items-start gap-2 text-[13px] text-pretty text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
          The draft is in your review queue. Nothing publishes until you approve it.
        </p>
      </CardContent>
    </Card>
  );
}
