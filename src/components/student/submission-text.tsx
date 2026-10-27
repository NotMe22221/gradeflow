import { ChevronRight, FileText } from "@/components/icons";

import { pluralize, wordCount } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The id of the "Your paper" disclosure, which Your work's paper tile opens. */
export const PAPER_ANCHOR = "your-paper";

/**
 * The student's own paper in a disclosure card. Native <details> keeps it
 * keyboard-accessible without client JavaScript. The paper is rendered as a
 * text node only, never as HTML.
 */
export function SubmissionText({
  content,
  fileName,
  label = "Your paper",
  className,
}: {
  content: string;
  fileName?: string | null;
  label?: string;
  className?: string;
}) {
  return (
    <details
      id={PAPER_ANCHOR}
      className={cn("group scroll-mt-24 overflow-hidden rounded-3xl border border-border bg-card", className)}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-semibold text-foreground transition-colors outline-none select-none hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <ChevronRight
            className="size-5 text-muted-foreground transition-transform group-open:rotate-90"
            aria-hidden
          />
          <span className="font-display font-extrabold tracking-[-0.01em]">{label}</span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-normal text-muted-foreground">
          {fileName ? (
            <>
              <FileText className="size-3.5 shrink-0" aria-hidden />
              <span className="hidden max-w-48 truncate sm:inline">{fileName}</span>
              <span className="hidden sm:inline" aria-hidden>
                ·
              </span>
            </>
          ) : null}
          <span className="tabular shrink-0">{pluralize(wordCount(content), "word")}</span>
        </span>
      </summary>
      <div className="border-t border-border px-4 py-5 sm:px-6">
        <div className="max-w-prose text-[0.9375rem] leading-7 break-words whitespace-pre-wrap text-foreground">
          {content}
        </div>
      </div>
    </details>
  );
}
