import { ChevronRight, FileText } from "lucide-react";

import { pluralize, wordCount } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The student's own paper in a disclosure. Native <details> keeps it
 * keyboard-accessible without client JavaScript. The paper is rendered as a
 * text node only, never as HTML.
 */
export function SubmissionText({
  content,
  fileName,
  label = "Your submission",
  className,
}: {
  content: string;
  fileName?: string | null;
  label?: string;
  className?: string;
}) {
  return (
    <details className={cn("group border-t border-border", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 text-sm font-medium text-foreground transition-colors outline-none select-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <ChevronRight
            className="size-4 text-muted-foreground transition-transform group-open:rotate-90"
            aria-hidden
          />
          {label}
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
      <div className="px-4 pb-6 sm:px-6">
        <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-border bg-background px-4 py-4 text-[15px] leading-7 break-words whitespace-pre-wrap text-foreground sm:px-6">
          {content}
        </div>
      </div>
    </details>
  );
}
