import Link from "next/link";
import { ChevronRight, CircleCheckBig } from "@/components/icons";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatPercent, formatRelative, formatScore } from "@/lib/format";
import type { RecentlyPublished as RecentlyPublishedItem } from "@/lib/stats";
import { cn } from "@/lib/utils";

/** A Home side card: title row, content, optional footer link. */
export function SideCard({
  id,
  title,
  href,
  linkLabel,
  footnote,
  className,
  children,
}: {
  id: string;
  title: string;
  href?: string;
  linkLabel?: string;
  footnote?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card", className)}
    >
      <div className="flex min-h-14 items-center justify-between gap-3 px-5 pt-2">
        <h2 id={id} className="text-base font-medium text-foreground">
          {title}
        </h2>
        {href && linkLabel ? (
          <Button asChild variant="text" size="sm" className="-mr-2.5 h-10 shrink-0">
            <Link href={href}>
              {linkLabel}
              <ChevronRight aria-hidden />
            </Link>
          </Button>
        ) : null}
      </div>
      <div className="flex-1">{children}</div>
      {footnote ? <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">{footnote}</p> : null}
    </section>
  );
}

/** Quiet empty line inside a side card. */
export function SideCardEmpty({ icon: Icon, children }: { icon: typeof CircleCheckBig; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 pt-1 pb-5 text-sm text-muted-foreground">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary">
        <Icon className="size-4" aria-hidden />
      </span>
      <p className="min-w-0 pt-2 text-pretty">{children}</p>
    </div>
  );
}

/** The latest teacher-approved grades. Scores come from PublishedGrade only. */
export function RecentlyPublished({
  items,
  now,
  timeZone,
  className,
}: {
  items: RecentlyPublishedItem[];
  now: Date;
  /** The viewer's time zone for dates past a week and the tooltip; undefined uses the server's. */
  timeZone?: string;
  className?: string;
}) {
  return (
    <SideCard
      id="recently-published-heading"
      title="Recently published"
      href="/gradebook"
      linkLabel="Gradebook"
      className={className}
    >
      {items.length === 0 ? (
        <SideCardEmpty icon={CircleCheckBig}>Approved grades show up here. Approve a paper in To review to publish it.</SideCardEmpty>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {items.map((item) => (
            <li key={item.submissionId}>
              <Link
                href={`/assignments/${encodeURIComponent(item.assignmentId)}`}
                className="flex min-h-14 items-center gap-3 px-5 py-2.5 transition-colors outline-none hover:bg-foreground/[0.03] focus-visible:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset"
              >
                <Avatar name={item.studentName} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.studentName}</p>
                  <p className="truncate text-xs text-muted-foreground" title={item.assignmentTitle}>
                    {item.assignmentTitle}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-sm font-medium text-foreground">
                    {formatScore(item.totalScore, item.maxScore)}
                    <span className="sr-only">, {formatPercent(item.totalScore, item.maxScore)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <time dateTime={item.publishedAt.toISOString()} title={formatDateTime(item.publishedAt, timeZone)}>
                      {formatRelative(item.publishedAt, now, timeZone)}
                    </time>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SideCard>
  );
}
