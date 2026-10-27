import Link from "next/link";

import { CircleCheckBig, type IconComponent } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { formatDateTime, formatPercent, formatRelative, formatScore } from "@/lib/format";
import type { RecentlyPublished as RecentlyPublishedItem } from "@/lib/stats";
import { cn } from "@/lib/utils";

/** A Home list card: rows (or an empty line) and an optional footnote. The section heading sits above it. */
export function ListCard({
  footnote,
  className,
  children,
}: {
  footnote?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card", className)}>
      <div className="flex-1">{children}</div>
      {footnote ? (
        <p className="border-t border-border px-5 py-3 text-[0.75rem] leading-5 text-muted-foreground">{footnote}</p>
      ) : null}
    </div>
  );
}

/** Quiet empty line inside a list card. */
export function ListCardEmpty({ icon: Icon, children }: { icon: IconComponent; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 py-4 text-[0.875rem] leading-5 text-muted-foreground">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary">
        <Icon className="size-[1.125rem]" aria-hidden />
      </span>
      <p className="min-w-0 pt-2 text-pretty">{children}</p>
    </div>
  );
}

/**
 * The latest grades the teacher approved and returned. Scores come from
 * PublishedGrade only. Rows tighten with the compact density setting.
 */
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
    <ListCard className={className}>
      {items.length === 0 ? (
        <ListCardEmpty icon={CircleCheckBig}>
          Grades you approve show up here. Approve a paper in To review to return it.
        </ListCardEmpty>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.submissionId}>
              <Link
                href={`/assignments/${encodeURIComponent(item.assignmentId)}`}
                className="flex min-h-row-min items-center gap-3 px-5 py-row transition-colors outline-none hover:bg-foreground/[0.03] focus-visible:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <Avatar name={item.studentName} className="size-9 compact:size-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.875rem] leading-5 font-medium text-foreground">{item.studentName}</p>
                  <p className="truncate text-[0.75rem] leading-5 text-muted-foreground" title={item.assignmentTitle}>
                    {item.assignmentTitle}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-[0.875rem] leading-5 font-medium text-foreground">
                    {formatScore(item.totalScore, item.maxScore)}
                    <span className="sr-only">, {formatPercent(item.totalScore, item.maxScore)}</span>
                  </p>
                  <p className="text-[0.75rem] leading-5 text-muted-foreground">
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
    </ListCard>
  );
}
