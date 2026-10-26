"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, Camera, ChevronDown, Inbox } from "lucide-react";

import { workCounts } from "@/components/classes/status-summary";
import { AssignmentIcon } from "@/components/classwork/assignment-icon";
import type { ClassworkItem } from "@/components/classwork/types";
import { WorkCounts } from "@/components/classwork/work-counts";
import { scanHref } from "@/components/assignments/scan-links";
import { Button } from "@/components/ui/button";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

const TOPICS: { key: "essays" | "tests"; title: string; isTest: boolean }[] = [
  { key: "essays", title: "Essays", isTest: false },
  { key: "tests", title: "Handwritten tests", isTest: true },
];

/** The short status hint on a collapsed row: what needs you next, if anything. */
function StatusHint({ item }: { item: ClassworkItem }) {
  if (item.summary.review > 0) {
    return (
      <span className="tabular inline-flex h-6 items-center rounded-full bg-primary-soft px-2.5 text-xs font-medium whitespace-nowrap text-primary-soft-foreground">
        {item.summary.review} to review
      </span>
    );
  }
  if (item.summary.ready > 0) {
    return (
      <span className="tabular text-xs whitespace-nowrap text-muted-foreground">
        {item.summary.ready} ready for AI pass
      </span>
    );
  }
  return null;
}

function ClassworkRow({
  item,
  color,
  expanded,
  onToggle,
}: {
  item: ClassworkItem;
  color: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const detailsId = useId();
  const counts = workCounts(item.summary);
  const reviewHref = `/review?assignment=${encodeURIComponent(item.id)}`;
  const dueText = item.dueLabel ?? item.postedLabel;
  const noun = item.isTest
    ? pluralize(item.criteriaCount, "question")
    : pluralize(item.criteriaCount, "criterion", "criteria");

  return (
    <li
      className={cn(
        "rounded-xl border border-border bg-card transition-shadow",
        expanded ? "shadow-hover" : "hover:shadow-hover"
      )}
    >
      <h3 className="font-sans">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={detailsId}
          className="flex min-h-16 w-full items-center gap-4 rounded-xl px-4 py-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <AssignmentIcon isTest={item.isTest} color={color} />
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-[15px] font-medium break-words text-foreground sm:line-clamp-1">{item.title}</span>
            {/* Phones: due date and status under the title. */}
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:hidden">
              <span>{dueText}</span>
              <StatusHint item={item} />
            </span>
          </span>
          <span className="hidden shrink-0 items-center gap-4 sm:flex">
            <StatusHint item={item} />
            <span className="w-28 text-right text-[13px] whitespace-nowrap text-muted-foreground">{dueText}</span>
          </span>
          <ChevronDown
            className={cn("size-5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
            aria-hidden
          />
        </button>
      </h3>

      <div id={detailsId} hidden={!expanded}>
        <div className="flex flex-col gap-5 border-t border-border px-4 py-5 sm:pl-[4.5rem] md:flex-row md:items-start md:justify-between md:gap-8">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="tabular text-xs text-muted-foreground">
              {item.postedLabel} · {pluralize(item.totalPoints, "point")} · {noun}
            </p>
            {item.excerpt ? (
              <p className="line-clamp-3 text-sm leading-relaxed break-words whitespace-pre-line text-foreground/90">
                {item.excerpt}
              </p>
            ) : null}
            {item.summary.ready > 0 && !item.isTest ? (
              <p className="tabular text-[13px] text-muted-foreground">
                {pluralize(item.summary.ready, "paper")} ready for the AI first pass.
              </p>
            ) : null}
          </div>
          {item.summary.total > 0 ? (
            <WorkCounts counts={counts} isTest={item.isTest} className="shrink-0" />
          ) : (
            <p className="text-[13px] text-muted-foreground">Add students to start collecting work.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 sm:pl-[4.5rem]">
          <Button variant="text" asChild className="-ml-3 sm:-ml-4">
            <Link href={`/assignments/${encodeURIComponent(item.id)}`}>
              View assignment
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {item.isTest && counts.assigned > 0 && item.summary.total > 0 ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={scanHref(item.id)}>
                  <Camera aria-hidden />
                  Scan papers
                </Link>
              </Button>
            ) : null}
            {item.summary.review > 0 ? (
              <Button variant="tonal" size="sm" asChild>
                <Link href={reviewHref}>
                  <Inbox aria-hidden />
                  Review {pluralize(item.summary.review, "paper")}
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * The Classwork list, grouped into topics like Classroom ("Essays",
 * "Handwritten tests"). Clicking a row expands it in place with the posted
 * date, a prompt excerpt, the Turned in / Assigned / Graded numbers, and
 * links to the assignment and its review queue.
 */
export function ClassworkList({ items, color }: { items: ClassworkItem[]; color: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      {TOPICS.map((topic) => {
        const topicItems = items.filter((item) => item.isTest === topic.isTest);
        if (topicItems.length === 0) return null;
        return (
          <section key={topic.key} aria-labelledby={`topic-${topic.key}`}>
            <div className="mb-4 flex items-end justify-between gap-4 border-b border-primary pb-2">
              <h2 id={`topic-${topic.key}`} className="text-[22px] leading-tight font-normal text-primary sm:text-2xl">
                {topic.title}
              </h2>
              <span className="tabular pb-0.5 text-[13px] text-muted-foreground">
                {pluralize(topicItems.length, topic.isTest ? "test" : "assignment")}
              </span>
            </div>
            <ul className="space-y-2">
              {topicItems.map((item) => (
                <ClassworkRow
                  key={item.id}
                  item={item}
                  color={color}
                  expanded={expandedId === item.id}
                  onToggle={() => setExpandedId((current) => (current === item.id ? null : item.id))}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
