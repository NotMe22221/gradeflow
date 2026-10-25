"use client";

import { Clock, FileText, Type } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { markDomId, type EvidenceLayout } from "@/components/review/review-model";
import type { ReviewItem } from "@/components/review/types";
import { formatDateTime, formatRelative, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The student's paper as plain text, with verified evidence quotes
 * highlighted in place. The paper is untrusted input: it is only ever
 * rendered as React text nodes, never as HTML.
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
  const markCount = layout.segments.filter((segment) => segment.kind === "mark").length;

  return (
    <div className={cn("bg-background", className)}>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 lg:py-8">
        <header className="mb-6 flex items-start gap-3">
          <Avatar name={item.student.name} className="size-10 text-sm" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
              {item.student.name}
            </h2>
            <p className="truncate text-sm text-muted-foreground">
              {item.assignment.title}
              <span aria-hidden> · </span>
              <span className="sr-only">, </span>
              {item.assignment.className}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" aria-hidden />
                <span title={formatDateTime(item.submittedAt)} suppressHydrationWarning>
                  Submitted {formatRelative(item.submittedAt)}
                </span>
              </span>
              <span className="tabular inline-flex items-center gap-1.5">
                <Type className="size-3.5" aria-hidden />
                {pluralize(item.wordCount, "word")}
              </span>
              {item.fileName ? (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <FileText className="size-3.5 shrink-0" aria-hidden />
                  <span className="sr-only">File: </span>
                  <span className="truncate">{item.fileName}</span>
                </span>
              ) : null}
            </div>
          </div>
        </header>

        {markCount > 0 ? (
          <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-3 w-5 shrink-0 rounded-sm bg-highlight ring-1 ring-highlight-strong" aria-hidden />
            Highlights are quotes the AI used as evidence, verified in the paper. Numbers match the rubric.
          </p>
        ) : null}

        <article
          aria-label={`Paper by ${item.student.name}`}
          className="rounded-xl border border-border bg-card px-5 py-6 shadow-card sm:px-10 sm:py-10"
        >
          <div className="mx-auto max-w-prose text-[15px] leading-7 break-words whitespace-pre-wrap text-foreground">
            {layout.segments.map((segment, index) =>
              segment.kind === "text" ? (
                <span key={index}>{segment.text}</span>
              ) : (
                <mark
                  key={index}
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
                      className="tabular mr-1 inline-flex h-4 min-w-4 -translate-y-px items-center justify-center rounded-full bg-highlight-strong px-1 align-middle text-[10px] leading-none font-semibold text-foreground"
                    >
                      {ref.number}
                    </span>
                  ))}
                  {segment.text}
                </mark>
              )
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
