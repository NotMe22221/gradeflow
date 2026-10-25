"use client";

import { CheckCheck, LoaderCircle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { firstName, formatPoints, formatScore } from "@/lib/format";
import type { DraftSummary } from "@/lib/review/model";
import type { ReviewItem } from "@/lib/review/types";

/**
 * The deliberate approval step. Only this dialog's confirm button publishes;
 * focus starts on Cancel, so a stray Enter after "A" never publishes.
 */
export function ApproveDialog({
  open,
  onOpenChange,
  item,
  summary,
  pending,
  onConfirm,
  restoreFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ReviewItem;
  summary: DraftSummary;
  pending: boolean;
  onConfirm: () => void;
  /** Moves focus back to the page on close (there is no trigger to return to). */
  restoreFocus: () => void;
}) {
  const name = item.student.name;
  const scores = new Map(summary.payload.scores.map((entry) => [entry.criterionId, entry.score]));

  return (
    <AlertDialog open={open} onOpenChange={(next) => (pending ? undefined : onOpenChange(next))}>
      <AlertDialogContent
        onEscapeKeyDown={(event) => pending && event.preventDefault()}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="tabular">
            Publish {formatScore(summary.total, summary.maxTotal)} for {name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This grade will appear in the gradebook and on {firstName(name)}&apos;s assignment page. You
            can&apos;t unpublish from the demo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <dl className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-muted/40 text-[13px]">
          {item.criteria.map((criterion, index) => (
            <div key={criterion.id} className="flex items-center justify-between gap-4 px-3 py-2">
              <dt className="min-w-0 truncate text-muted-foreground">
                {index + 1}. {criterion.title}
              </dt>
              <dd className="tabular shrink-0 font-medium text-foreground">
                {formatPoints(scores.get(criterion.id) ?? null)}
                <span className="text-muted-foreground"> / {criterion.maxPoints}</span>
              </dd>
            </div>
          ))}
        </dl>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button type="button" onClick={onConfirm} disabled={pending || !summary.ready}>
            {pending ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden />
                Publishing…
              </>
            ) : (
              <>
                <CheckCheck aria-hidden />
                Approve &amp; publish
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
