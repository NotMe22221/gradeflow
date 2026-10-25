import { Undo2 } from "lucide-react";

import { formatDate } from "@/lib/format";

/** The teacher's send-back note, shown above the resubmit form. */
export function ReturnedNotice({
  returnNote,
  returnedAt,
  teacherName,
}: {
  returnNote: string | null;
  returnedAt: Date | null;
  teacherName: string | null;
}) {
  const note = returnNote?.trim();

  return (
    <div className="rounded-xl border border-warning/30 bg-warning-soft p-5 sm:p-6">
      <div className="flex gap-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-warning-soft-foreground shadow-card ring-1 ring-warning/30">
          <Undo2 className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Your teacher sent this back
          </h2>
          <p className="text-sm text-warning-soft-foreground">
            {returnedAt ? `Sent back ${formatDate(returnedAt)}. ` : ""}
            Revise your paper and resubmit it below.
          </p>
          {note ? (
            <figure className="mt-4 rounded-lg border border-warning/25 bg-card px-4 py-3 shadow-card">
              <blockquote className="text-[15px] leading-7 break-words whitespace-pre-line text-foreground">
                &ldquo;{note}&rdquo;
              </blockquote>
              {teacherName ? (
                <figcaption className="mt-2 text-xs text-muted-foreground">{teacherName}</figcaption>
              ) : null}
            </figure>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Your teacher didn&apos;t leave a note this time.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
