import Link from "next/link";
import { CalendarDays, ChevronRight, ClipboardList, Plus } from "lucide-react";

import { describeSummary, StatusBar, type StatusSummary } from "@/components/classes/status-summary";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, pluralize } from "@/lib/format";

export type AssignmentListItem = {
  id: string;
  title: string;
  dueDate: Date | null;
  totalPoints: number;
  criteriaCount: number;
  summary: StatusSummary;
};

export function AssignmentList({ classId, items }: { classId: string; items: AssignmentListItem[] }) {
  const toReview = items.reduce((sum, item) => sum + item.summary.review, 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle>
          <h2>Assignments</h2>
        </CardTitle>
        <CardDescription>
          {items.length === 0
            ? "Each assignment has its own rubric and review queue."
            : toReview > 0
              ? `${pluralize(toReview, "paper")} waiting for your review.`
              : `${pluralize(items.length, "assignment")}. Nothing is waiting for your review.`}
        </CardDescription>
      </CardHeader>
      {items.length === 0 ? (
        <div className="px-6 pb-6">
          <EmptyState
            icon={ClipboardList}
            title="Create an assignment and rubric to start collecting papers."
            action={
              <Button asChild>
                <Link href={`/classes/${classId}/assignments/new`}>
                  <Plus aria-hidden />
                  New assignment
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/assignments/${item.id}`}
                className="group flex flex-col gap-3 px-6 py-4 transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-sm font-medium text-pretty text-foreground">{item.title}</h3>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" aria-hidden />
                        {item.dueDate ? `Due ${formatDate(item.dueDate)}` : "No due date"}
                      </span>
                      <span className="tabular">{pluralize(item.totalPoints, "point")}</span>
                      <span className="tabular">{pluralize(item.criteriaCount, "criterion", "criteria")}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.summary.review > 0 ? (
                      <Badge variant="warning" className="tabular">
                        {item.summary.review} to review
                      </Badge>
                    ) : null}
                    <ChevronRight
                      className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <StatusBar summary={item.summary} />
                  <p className="text-[13px] text-muted-foreground tabular">{describeSummary(item.summary)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
