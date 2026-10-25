"use client";

import { ArrowUpDown, ChevronLeft, ChevronRight, ChevronsUpDown, Keyboard, ListFilter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { QueueList } from "@/components/review/queue-list";
import type { QueueSort, ReviewFilterOption, ReviewItem } from "@/components/review/types";
import { pluralize } from "@/lib/format";

const ALL = "all";

export const SORT_LABELS: Record<QueueSort, string> = {
  confidence: "Lowest confidence first",
  oldest: "Oldest first",
};

export function ReviewHeader({
  totalCount,
  visibleCount,
  filter,
  filterOptions,
  filterTitle,
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
  const filterLabel =
    filter === null ? "All assignments" : (selectedOption?.title ?? filterTitle ?? "Selected assignment");

  const countLine =
    totalCount === 0
      ? "Your queue is clear"
      : `${pluralize(totalCount, "paper")} waiting for your review${
          filter !== null ? ` · ${visibleCount} in this assignment` : ""
        }`;

  return (
    <div className="border-b border-border bg-card px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="mr-auto min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Review queue</h1>
          <p className="tabular text-sm text-muted-foreground" aria-live="polite">
            {countLine}
          </p>
        </div>

        <div className="order-last flex w-full flex-wrap items-center gap-2 lg:order-none lg:w-auto">
          {filterOptions.length > 0 || filter !== null ? (
            <Select value={filter ?? ALL} onValueChange={(value) => onFilterChange(value === ALL ? null : value)}>
              <SelectTrigger className="min-w-0 flex-1 sm:w-52 sm:flex-none" aria-label="Filter by assignment">
                <ListFilter className="text-muted-foreground" aria-hidden />
                <SelectValue placeholder="All assignments">{filterLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
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
              <SelectTrigger className="min-w-0 flex-1 sm:w-48 sm:flex-none" aria-label="Sort the queue">
                <ArrowUpDown className="text-muted-foreground" aria-hidden />
                <SelectValue>{SORT_LABELS[sort]}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="confidence">{SORT_LABELS.confidence}</SelectItem>
                <SelectItem value="oldest">{SORT_LABELS.oldest}</SelectItem>
              </SelectContent>
            </Select>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onShowShortcuts}
            className="hidden lg:inline-flex"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard aria-hidden />
            <span className="hidden xl:inline">Keyboard shortcuts</span>
            <Kbd aria-hidden>?</Kbd>
          </Button>
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
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-baseline justify-between gap-2 border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">Queue</p>
                  <p className="text-xs text-muted-foreground">{SORT_LABELS[sort]}</p>
                </div>
                <QueueList
                  items={queue}
                  currentId={currentId}
                  onSelect={(id) => {
                    onSelect(id);
                    onQueueOpenChange(false);
                  }}
                  className="max-h-[min(60dvh,26rem)] overflow-y-auto p-2"
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
