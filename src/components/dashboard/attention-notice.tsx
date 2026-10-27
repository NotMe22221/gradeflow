import { Fragment } from "react";
import Link from "next/link";

import { CircleCheck, ClipboardCheck, ListChecks, type IconComponent } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { pluralize } from "@/lib/format";
import type { WaitingAssignment } from "@/lib/stats";
import { cn } from "@/lib/utils";

const LISTED = 3;
const LINK =
  "rounded-sm text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring";

function assignmentHref(id: string): string {
  return `/assignments/${encodeURIComponent(id)}`;
}

/** Straight to the one assignment with drafts waiting, else the whole To review queue. */
function reviewHref(review: WaitingAssignment[]): string {
  return review.length === 1 && review[0] ? `/review?assignment=${encodeURIComponent(review[0].id)}` : "/review";
}

/** "Persuasive Essay (4), Lab Report (2) and 1 more", each title a link. */
function AssignmentLinks({ items, href }: { items: WaitingAssignment[]; href: (item: WaitingAssignment) => string }) {
  const listed = items.slice(0, LISTED);
  const more = items.length - listed.length;
  return (
    <>
      {listed.map((item, index) => (
        <Fragment key={item.id}>
          {index > 0 ? (index === listed.length - 1 && more === 0 ? " and " : ", ") : null}
          <Link href={href(item)} className={LINK}>
            {item.title}
          </Link>{" "}
          <span className="tabular">({item.count})</span>
        </Fragment>
      ))}
      {more > 0 ? ` and ${more} more` : null}
    </>
  );
}

/**
 * "What needs me?" in one line, above Home's sections: drafts waiting in To
 * review (the one filled button on the page opens them), else papers ready
 * for an AI first pass, else a calm all-clear. Counts come from the same
 * queries as the review badge and the class cards; the "worth rechecking"
 * count uses To review's own rule (getWorthRecheckingCount).
 */
export function AttentionNotice({
  pendingReview,
  readyForAi,
  review,
  worthRechecking = 0,
  ready,
  hasClasses,
  className,
}: {
  pendingReview: number;
  readyForAi: number;
  /** Assignments with drafts in To review, most papers first. */
  review: WaitingAssignment[];
  /** Drafts in To review worth rechecking (lib/review/recheck.ts), as To review counts them. */
  worthRechecking?: number;
  /** Assignments with papers ready for an AI first pass, most papers first. */
  ready: WaitingAssignment[];
  hasClasses: boolean;
  className?: string;
}) {
  if (pendingReview <= 0 && readyForAi <= 0 && !hasClasses) return null;

  let icon: IconComponent;
  let tone: string;
  let headline: string;
  let detail: React.ReactNode;
  let action: React.ReactNode = null;

  if (pendingReview > 0) {
    icon = ClipboardCheck;
    tone = "bg-primary-soft text-primary-soft-foreground";
    headline = `${pluralize(pendingReview, "paper")} ${pendingReview === 1 ? "is" : "are"} waiting for your review`;
    detail = (
      <>
        {review.length > 0 ? (
          <>
            <AssignmentLinks items={review} href={(item) => `/review?assignment=${encodeURIComponent(item.id)}`} />.{" "}
          </>
        ) : null}
        Nothing reaches students until you approve it.
        {worthRechecking > 0 ? (
          <span className="mt-1 block">
            <Link href="/review?sort=recheck" className={LINK}>
              {pluralize(worthRechecking, "draft")} {worthRechecking === 1 ? "is" : "are"} worth rechecking
            </Link>{" "}
            before you approve {worthRechecking === 1 ? "it" : "them"}.
          </span>
        ) : null}
        {readyForAi > 0 ? (
          <span className="mt-1 block">
            Also ready for an AI first pass: <AssignmentLinks items={ready} href={(item) => assignmentHref(item.id)} />.
          </span>
        ) : null}
      </>
    );
    action = (
      <Button asChild>
        <Link href={reviewHref(review)}>Open To review</Link>
      </Button>
    );
  } else if (readyForAi > 0) {
    const first = ready[0];
    icon = ListChecks;
    tone = "bg-secondary text-foreground";
    headline = `${pluralize(readyForAi, "paper")} ${readyForAi === 1 ? "is" : "are"} ready for an AI first pass`;
    detail = (
      <>
        {ready.length > 0 ? (
          <>
            <AssignmentLinks items={ready} href={(item) => assignmentHref(item.id)} />.{" "}
          </>
        ) : null}
        Drafts wait in To review for your approval.
      </>
    );
    action = first ? (
      <Button asChild>
        <Link href={assignmentHref(first.id)} aria-label={`Open assignment: ${first.title}`}>
          Open assignment
        </Link>
      </Button>
    ) : null;
  } else {
    icon = CircleCheck;
    tone = "bg-success-soft text-success-soft-foreground";
    headline = "You're all caught up";
    detail = "Nothing is waiting for your review or for an AI first pass.";
    action = (
      <Button asChild variant="text">
        <Link href="/gradebook">Open gradebook</Link>
      </Button>
    );
  }

  const Icon = icon;
  return (
    <section
      aria-labelledby="attention-heading"
      className={cn(
        "flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5 sm:pr-6",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", tone)}>
          <Icon className="size-6" filled aria-hidden />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2
            id="attention-heading"
            className="font-display text-[1.125rem] leading-6 font-extrabold tracking-[-0.01em] text-balance text-foreground"
          >
            {headline}
          </h2>
          <p className="mt-0.5 max-w-[75ch] text-[0.875rem] leading-5 text-pretty text-muted-foreground">{detail}</p>
        </div>
      </div>
      {action ? <div className="flex shrink-0 max-sm:pl-16">{action}</div> : null}
    </section>
  );
}
