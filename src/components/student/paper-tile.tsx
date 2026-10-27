"use client";

import { FileText } from "@/components/icons";

import { PAPER_ANCHOR } from "@/components/student/submission-text";
import { pluralize } from "@/lib/format";

/**
 * The student's paper as an attachment tile in Your work, like a file chip
 * in Classroom. It opens the full text further down the page.
 */
export function PaperTile({
  words,
  fileName,
  label = "Your paper",
}: {
  words: number;
  fileName?: string | null;
  label?: string;
}) {
  return (
    <a
      href={`#${PAPER_ANCHOR}`}
      onClick={() => {
        const details = document.getElementById(PAPER_ANCHOR);
        if (details instanceof HTMLDetailsElement) details.open = true;
      }}
      className="group flex items-stretch overflow-hidden rounded-2xl border border-border bg-card transition-shadow outline-none hover:shadow-hover focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <span className="flex w-12 shrink-0 items-center justify-center border-r border-border bg-secondary text-primary">
        <FileText className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 px-3 py-2.5">
        <span className="block truncate text-sm font-medium text-foreground group-hover:underline">
          {fileName ?? label}
        </span>
        <span className="tabular block text-xs text-muted-foreground">{pluralize(words, "word")}</span>
      </span>
    </a>
  );
}
