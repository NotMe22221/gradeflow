"use client";

import { Clock, FileText, Flag, Type, Undo2 } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { formatDate, formatDateTime, formatRelative, pluralize } from "@/lib/format";
import {
  flaggedDomId,
  markDomId,
  type EvidenceLayout,
  type InlineSegment,
} from "@/lib/review/model";
import type { ReviewItem } from "@/lib/review/types";
import { cn } from "@/lib/utils";

/**
 * The student's paper as plain text, with verified evidence quotes
 * highlighted and grader-directed text flagged in place. The paper is
 * untrusted input: it is only ever rendered as React text nodes, never as
 * HTML.
 *
 * The root is `relative` so absolutely positioned screen-reader text stays
 * inside this pane (it is the scroll container on desktop) instead of
 * stretching the page.
 */
export function PaperPane({
  item,
  layout,
  className,
}: {
  item: ReviewItem;
  layout: EvidenceLayout;
  className?: string;
}) {
  const markCount = Object.keys(layout.markForCriterion).length;
  const previousReturn = item.previousReturn;

  const renderInline = (segment: InlineSegment, key: number) =>
    segment.kind === "text" ? (
      <span key={key}>{segment.text}</span>
    ) : (
      <mark
        key={key}
        id={markDomId(item.id, segment.markIndex)}
        className="scroll-my-24 rounded-sm bg-highlight box-decoration-clone px-0.5 text-foreground"
      >
        <span className="sr-only">
          {`Evidence for ${segment.criteria
            .map((ref) => `criterion ${ref.number}, ${ref.title}`)
            .join(" and ")}: `}
        </span>
        {segment.criteria.map((ref) => (
          <span
            key={ref.id}
            aria-hidden
            title={ref.title}
            className="tabular mr-1 inline-flex h-4 min-w-4 -translate-y-px items-center justify-center rounded-full bg-highlight-strong px-1 align-middle text-[10px] leading-none font-semibold text-foreground select-none"
          >
            {ref.number}
          </span>
        ))}
        {segment.text}
      </mark>
    );

  return (
    <div className={cn("relative bg-background", className)}>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 lg:py-8">
        <header className="mb-6 flex items-start gap-3">
          <Avatar name={item.student.name} className="size-10 text-sm" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
              {item.student.name}
            </h2>
            {/* Wraps to two lines so similar titles stay distinguishable. */}
            <p className="relative line-clamp-2 text-sm break-words text-muted-foreground">
              {item.assignment.title}
              <span aria-hidden> · </span>
              <span className="sr-only">, </span>
              {item.assignment.className}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" aria-hidden />
                <span title={formatDateTime(item.submittedAt)} suppressHydrationWarning>
                  {previousReturn ? "Resubmitted" : "Submitted"} {formatRelative(item.submittedAt)}
                </span>
              </span>
              <span className="tabular inline-flex items-center gap-1.5">
                <Type className="size-3.5" aria-hidden />
                {pluralize(item.wordCount, "word")}
              </span>
              {item.fileName ? (
                <span className="relative inline-flex max-w-full min-w-0 items-center gap-1.5">
                  <FileText className="size-3.5 shrink-0" aria-hidden />
                  <span className="sr-only">File: </span>
                  <span className="truncate">{item.fileName}</span>
                </span>
              ) : null}
            </div>
            {previousReturn ? (
              <p className="mt-2 flex items-start gap-1.5 text-[13px] text-muted-foreground">
                <Undo2 className="mt-[3px] size-3.5 shrink-0" aria-hidden />
                <span className="min-w-0 break-words whitespace-pre-line">
                  <span title={formatDateTime(previousReturn.at)} suppressHydrationWarning>
                    You sent this back {formatDate(previousReturn.at)}
                  </span>
                  {previousReturn.note ? <>: &ldquo;{previousReturn.note}&rdquo;</> : "."}
                </span>
              </p>
            ) : null}
          </div>
        </header>

        {markCount > 0 || layout.flaggedCount > 0 ? (
          <div className="mb-3 space-y-1.5 text-xs text-muted-foreground">
            {markCount > 0 ? (
              <p className="flex items-center gap-2">
                <span className="h-3 w-5 shrink-0 rounded-sm bg-highlight ring-1 ring-highlight-strong" aria-hidden />
                Highlights are quotes the {item.ai?.grader === "demo" ? "demo grader" : "AI"} used as evidence,
                verified in the paper. Numbers match the rubric.
              </p>
            ) : null}
            {layout.flaggedCount > 0 ? (
              <p className="flex items-center gap-2">
                <span className="h-3 w-5 shrink-0 rounded-sm bg-danger-soft ring-1 ring-danger/40" aria-hidden />
                Red marks show text addressed to the grader, flagged for your review.
              </p>
            ) : null}
          </div>
        ) : null}

        <article
          aria-label={`Paper by ${item.student.name}`}
          className="rounded-xl border border-border bg-card px-5 py-6 shadow-card sm:px-10 sm:py-10"
        >
          <div className="mx-auto max-w-prose text-[15px] leading-7 break-words whitespace-pre-wrap text-foreground">
            {layout.segments.map((segment, index) =>
              segment.kind === "flagged" ? (
                <mark
                  key={index}
                  id={flaggedDomId(item.id, segment.flagIndex)}
                  tabIndex={-1}
                  className="scroll-my-24 rounded-sm bg-danger-soft box-decoration-clone px-0.5 text-foreground ring-1 ring-danger/30 outline-none focus:ring-2 focus:ring-danger/60"
                >
                  <span
                    aria-hidden
                    className="mr-1 inline-flex -translate-y-px items-center gap-1 rounded-sm bg-danger/10 px-1 align-middle text-[10px] leading-4 font-semibold whitespace-nowrap text-danger-soft-foreground select-none"
                  >
                    <Flag className="size-2.5" />
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
      </div>
    </div>
  );
}
