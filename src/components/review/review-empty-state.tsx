import Link from "next/link";
import { BookOpen, CircleCheck, Inbox, ListFilter, Table2 } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { pluralize } from "@/lib/format";

/** Nothing has landed in the queue yet. */
export function QueueEmptyState() {
  return (
    <EmptyState
      icon={Inbox}
      title="Nothing to review"
      description="Run an AI first pass on an assignment and its papers land here for your approval."
      action={
        <Button asChild>
          <Link href="/classes">
            <BookOpen aria-hidden />
            Go to classes
          </Link>
        </Button>
      }
      className="w-full max-w-lg"
    />
  );
}

/** The teacher cleared the queue in this session. */
export function CaughtUpState() {
  return (
    <div className="flex w-full max-w-lg flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground">
        <CircleCheck className="size-6" aria-hidden />
      </div>
      <h2 className="text-lg font-medium text-foreground">You&apos;re all caught up</h2>
      <p className="mt-1 max-w-sm text-sm text-pretty text-muted-foreground">
        Every grade in the gradebook has your approval behind it.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link href="/gradebook">
            <Table2 aria-hidden />
            Open gradebook
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/classes">
            <BookOpen aria-hidden />
            Go to classes
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** The assignment filter matches nothing, but other papers are waiting. */
export function FilteredEmptyState({
  assignmentTitle,
  otherCount,
  onShowAll,
}: {
  assignmentTitle: string | null;
  otherCount: number;
  onShowAll: () => void;
}) {
  return (
    <EmptyState
      icon={ListFilter}
      title={
        assignmentTitle ? `Nothing to review in ${assignmentTitle}` : "Nothing to review for this assignment"
      }
      description={`${pluralize(otherCount, "paper")} from other assignments ${otherCount === 1 ? "is" : "are"} waiting for your review.`}
      action={<Button onClick={onShowAll}>Show all assignments</Button>}
      className="w-full max-w-lg"
    />
  );
}
