"use client";

import { ArrowUpDown, ChevronLeft, ChevronRight, ChevronsUpDown, Keyboard, ListFilter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { QueueList } from "@/components/review/queue-list";
import { pluralize } from "@/lib/format";
import type { QueueSort, ReviewFilterOption, ReviewItem } from "@/lib/review/types";

const ALL = "all";

/** Short labels for the sort trigger, so they fit without clipping. */
export const SORT_LABELS: Record<QueueSort, string> = {
  confidence: "Lowest confidence",
  oldest: "Oldest first",
};

/** Full wording for the sort menu and the queue list headings. */
export const SORT_DESCRIPTIONS: Record<QueueSort, string> = {
  confidence: "Lowest confidence first",
  oldest: "Oldest first",
};

// Select values are flex rows (see SelectTrigger). Growing the value keeps
// short labels next to their icon, and the inner span gets the ellipsis.
const SELECT_VALUE_CLASS = "min-w-0 flex-1 text-left";

export function ReviewHeader({
  totalCount,
  visibleCount,
  filter,
  filterOptions,
  filterTitle,
  labels,
  onFilterChange,
  sort,
  onSortChange,
  queue,
  currentId,
  position,
  onSelect,
  onPrevious,
  onNext,
  queueOpen,
  onQueueOpenChange,
  onShowShortcuts,
}: {
  totalCount: number;
  visibleCount: number;
  filter: string | null;
  filterOptions: ReviewFilterOption[];
  filterTitle: string | null;
  /** Short, distinguishable assignment labels by assignment id. */
  labels: Map<string, string>;
  onFilterChange: (assignmentId: string | null) => void;
  sort: QueueSort;
  onSortChange: (sort: QueueSort) => void;
  queue: ReviewItem[];
  currentId: string | null;
  /** 1-based index of the current paper in `queue`, or 0 when empty. */
  position: number;
  onSelect: (id: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  queueOpen: boolean;
  onQueueOpenChange: (open: boolean) => void;
  onShowShortcuts: () => void;
}) {
  const titleCounts = new Map<string, number>();
  for (const option of filterOptions) titleCounts.set(option.title, (titleCounts.get(option.title) ?? 0) + 1);
  const selectedOption = filterOptions.find((option) => option.id === filter);
  const filterMissing = filter !== null && !selectedOption;
  const fullFilterTitle =
    filter === null ? "All assignments" : (selectedOption?.title ?? filterTitle ?? "Selected assignment");
  const filterLabel = (filter !== null ? labels.get(filter) : undefined) ?? fullFilterTitle;

  const countLine =
    totalCount === 0
      ? "Your queue is clear"
      : `${pluralize(totalCount, "paper")} waiting for your review${
          filter !== null ? ` · ${visibleCount} in this assignment` : ""
        }`;

  return (
    <div className="border-b border-border bg-card px-4 py-3 sm:px-6">
      {/*
        One row from 1280px up: title (shrinks, subtitle truncates), filter,
        sort, shortcuts, pager. Below lg the controls take their own row and
        the pager stays next to the title.
      */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-40">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">Review queue</h1>
          <p className="tabular text-sm text-muted-foreground lg:truncate" aria-live="polite" title={countLine}>
            {countLine}
          </p>
        </div>

        <div className="order-last flex w-full min-w-0 items-center gap-2 lg:order-none lg:w-auto">
          {filterOptions.length > 0 || filter !== null ? (
            <Select value={filter ?? ALL} onValueChange={(value) => onFilterChange(value === ALL ? null : value)}>
              <SelectTrigger
                className="min-w-0 flex-1 sm:w-64 sm:flex-none"
                aria-label={`Filter by assignment: ${fullFilterTitle}`}
                title={fullFilterTitle}
              >
                <ListFilter className="text-muted-foreground max-sm:hidden" aria-hidden />
                <SelectValue placeholder="All assignments" className={SELECT_VALUE_CLASS}>
                  <span className="truncate">{filterLabel}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" className="max-w-[min(32rem,calc(100vw-2rem))]">
                <SelectItem value={ALL}>
                  All assignments <span className="tabular text-muted-foreground">{totalCount}</span>
                </SelectItem>
                {filterOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.title}
                    {(titleCounts.get(option.title) ?? 0) > 1 ? (
                      <span className="text-muted-foreground"> · {option.className}</span>
                    ) : null}{" "}
                    <span className="tabular text-muted-foreground">{option.count}</span>
                  </SelectItem>
                ))}
                {filterMissing && filter ? (
                  <SelectItem value={filter}>
                    {filterTitle ?? "Selected assignment"} <span className="tabular text-muted-foreground">0</span>
                  </SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          ) : null}

          {totalCount > 0 ? (
            <Select value={sort} onValueChange={(value) => onSortChange(value as QueueSort)}>
              <SelectTrigger className="shrink-0 sm:w-52" aria-label="Sort the queue">
                <ArrowUpDown className="text-muted-foreground max-sm:hidden" aria-hidden />
                <SelectValue className={SELECT_VALUE_CLASS}>
                  <span className="truncate">{SORT_LABELS[sort]}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="confidence">{SORT_DESCRIPTIONS.confidence}</SelectItem>
                <SelectItem value="oldest">{SORT_DESCRIPTIONS.oldest}</SelectItem>
              </SelectContent>
            </Select>
          ) : null}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onShowShortcuts}
                className="hidden shrink-0 lg:inline-flex"
                aria-label="Keyboard shortcuts"
              >
                <Keyboard aria-hidden />
                <span className="hidden 2xl:inline">Keyboard shortcuts</span>
                <Kbd aria-hidden>?</Kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="2xl:hidden">Keyboard shortcuts</TooltipContent>
          </Tooltip>
        </div>

        {queue.length > 0 ? (
          <div className="ml-auto flex shrink-0 items-center rounded-lg border border-border bg-card shadow-card">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onPrevious}
                  disabled={position <= 1}
                  aria-label="Previous paper"
                  className="rounded-r-none"
                >
                  <ChevronLeft />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2">
                Previous <Kbd className="border-transparent">K</Kbd>
              </TooltipContent>
            </Tooltip>

            <Popover open={queueOpen} onOpenChange={onQueueOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="tabular h-8 rounded-none border-x border-border px-2.5 font-medium text-foreground 2xl:hidden"
                  aria-label={`Paper ${position} of ${queue.length}. Jump to another paper`}
                >
                  {position} of {queue.length}
                  <ChevronsUpDown className="size-3.5 text-muted-foreground" aria-hidden />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
                <div className="flex items-baseline justify-between gap-2 border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">Queue</p>
                  <p className="truncate text-xs text-muted-foreground">{SORT_DESCRIPTIONS[sort]}</p>
                </div>
                <QueueList
                  items={queue}
                  labels={labels}
                  currentId={currentId}
                  onSelect={(id) => {
                    onSelect(id);
                    onQueueOpenChange(false);
                  }}
                  className="max-h-[min(60dvh,26rem)] overflow-y-auto overscroll-contain p-2"
                />
              </PopoverContent>
            </Popover>
            <span
              className="tabular hidden h-8 items-center border-x border-border px-3 text-sm font-medium text-foreground 2xl:inline-flex"
              aria-live="polite"
            >
              {position} of {queue.length}
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onNext}
                  disabled={position >= queue.length}
                  aria-label="Next paper"
                  className="rounded-l-none"
                >
                  <ChevronRight />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2">
                Next <Kbd className="border-transparent">J</Kbd>
              </TooltipContent>
            </Tooltip>
          </div>
        ) : null}
      </div>
    </div>
  );
}
