import Link from "next/link";
import { CircleCheckBig } from "lucide-react";

import { SectionHeader } from "@/components/dashboard/section-header";
import { EmptyState } from "@/components/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { formatDateTime, formatPercent, formatRelative, formatScore } from "@/lib/format";
import type { RecentlyPublished as RecentlyPublishedItem } from "@/lib/stats";

/** The latest teacher-approved grades. Scores come from PublishedGrade only. */
export function RecentlyPublished({
  items,
  now,
  className,
}: {
  items: RecentlyPublishedItem[];
  now: Date;
  className?: string;
}) {
  return (
    <section aria-labelledby="recently-published-heading" className={className}>
      <SectionHeader id="recently-published-heading" title="Recently published" href="/gradebook" linkLabel="Gradebook" />

      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            icon={CircleCheckBig}
            title="Approved grades show up here."
            description="Approve a paper in the review queue to publish its grade."
            className="flex-1 rounded-none border-0 bg-transparent py-12"
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.submissionId}>
                <Link
                  href={`/assignments/${encodeURIComponent(item.assignmentId)}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors outline-none hover:bg-background focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <Avatar name={item.studentName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.studentName}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.assignmentTitle}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-sm font-semibold text-foreground">
                      {formatScore(item.totalScore, item.maxScore)}
                      <span className="sr-only">, {formatPercent(item.totalScore, item.maxScore)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <time dateTime={item.publishedAt.toISOString()} title={formatDateTime(item.publishedAt)}>
                        {formatRelative(item.publishedAt, now)}
                      </time>
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
