"use client";

import { useId } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  ListFilter,
  PanelLeft,
  PanelRight,
} from "@/components/icons";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { QueueList } from "@/components/review/queue-list";
import { TitlePeriod } from "@/components/page-header";
import type { PaperSide } from "@/lib/preferences/schema";
import { pluralize } from "@/lib/format";
import type { QueueSort, ReviewFilterOption, ReviewItem } from "@/lib/review/types";
import { cn } from "@/lib/utils";

const ALL = "all";

/** Short labels for the sort trigger, so they fit without clipping. */
export const SORT_LABELS: Record<QueueSort, string> = {
  recheck: "Worth rechecking",
  confidence: "Lowest confidence",
  oldest: "Oldest first",
};

/** Full wording for the sort menu and the grading list headings. */
export const SORT_DESCRIPTIONS: Record<QueueSort, string> = {
  recheck: "Worth rechecking first",
  confidence: "Lowest confidence first",
  oldest: "Oldest first",
};

// Select values are flex rows (see SelectTrigger). Growing the value keeps
// short labels next to their icon, and the inner span gets the ellipsis.
const SELECT_VALUE_CLASS = "min-w-0 flex-1 text-left";
const PILL_SELECT = "h-10 rounded-full pr-3 pl-4";

export function ReviewHeader({
  totalCount,
  visibleCount,
  filter,
  filterOptions,
  filterTitle,
  labels,
  totals,
  onFilterChange,
  sort,
  onSortChange,
  queue,
  current,
  position,
  onSelect,
  onPrevious,
  onNext,
  queueOpen,
  onQueueOpenChange,
  onShowShortcuts,
  paperSide = "left",
  onSwapPaperSide,
}: {
  totalCount: number;
  visibleCount: number;
  filter: string | null;
  filterOptions: ReviewFilterOption[];
  filterTitle: string | null;
  /** Short, distinguishable assignment labels by assignment id. */
  labels: Map<string, string>;
  /** Working draft grade per submission id, for the grading list. */
  totals: Map<string, string>;
  onFilterChange: (assignmentId: string | null) => void;
  sort: QueueSort;
  onSortChange: (sort: QueueSort) => void;
  queue: ReviewItem[];
  current: ReviewItem | null;
  /** 1-based index of the current paper in `queue`, or 0 when empty. */
  position: number;
  onSelect: (id: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  queueOpen: boolean;
  onQueueOpenChange: (open: boolean) => void;
  onShowShortcuts: () => void;
  /** Where the paper sits beside the grade panel on wide screens (a saved preference). */
  paperSide?: PaperSide;
  /** Swap paper and grade panel; omitted while there is no paper to show. */
  onSwapPaperSide?: () => void;
}) {
  const swapLabel = paperSide === "left" ? "Move the paper to the right" : "Move the paper to the left";
  const titleCounts = new Map<string, number>();
  for (const option of filterOptions) titleCounts.set(option.title, (titleCounts.get(option.title) ?? 0) + 1);
  const selectedOption = filterOptions.find((option) => option.id === filter);
  const filterMissing = filter !== null && !selectedOption;
  const fullFilterTitle =
    filter === null ? "All assignments" : (selectedOption?.title ?? filterTitle ?? "Selected assignment");
  const filterLabel = (filter !== null ? labels.get(filter) : undefined) ?? fullFilterTitle;

  // Kept short on purpose: on the one-row layout (a 72rem workspace, e.g.
  // 1440px with the drawer open) the title block is only about 11.5rem wide,
  // and the badge and the filter pill already carry the total and the
  // assignment. Both lines fit that width up to three-digit counts; the
  // ellipsis and the title stay as a safety net.
  const countLine =
    totalCount === 0
      ? "Your queue is clear"
      : filter !== null
        ? `Showing ${visibleCount} of ${pluralize(totalCount, "paper")}`
        : `${pluralize(totalCount, "paper")} waiting for review`;

  return (
    <div className="border-b border-border bg-card px-4 py-3 sm:px-6">
      {/*
        Wide (a 72rem workspace): title, filters, student switcher, and
        shortcuts on one row. Narrower, the switcher drops below the title and
        the filters take their own row (the container query follows the
        workspace width, so it also tracks the collapsed drawer). The
        skeleton in review-skeleton.tsx uses the same breakpoint.
      */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-44">
          <div className="flex items-center gap-2.5">
            <h1 className="display-title truncate text-[1.75rem] leading-9 text-foreground sm:text-[2rem]">
              To review
              <TitlePeriod />
            </h1>
            {totalCount > 0 ? (
              <span
                aria-hidden
                className="tabular inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary-soft px-2 text-[0.8125rem] font-medium text-primary-soft-foreground"
              >
                {totalCount}
              </span>
            ) : null}
          </div>
          <p className="tabular truncate text-sm text-muted-foreground" aria-live="polite" title={countLine}>
            {countLine}
          </p>
        </div>

        {filterOptions.length > 0 || filter !== null || totalCount > 0 ? (
          <div className="order-last flex w-full min-w-0 items-center gap-2 @6xl:order-none @6xl:w-auto">
            {filterOptions.length > 0 || filter !== null ? (
              <Select value={filter ?? ALL} onValueChange={(value) => onFilterChange(value === ALL ? null : value)}>
                <SelectTrigger
                  className={cn(PILL_SELECT, "min-w-0 flex-1 sm:w-60 sm:flex-none")}
                  aria-label={`Filter by assignment: ${fullFilterTitle}`}
                  title={fullFilterTitle}
                >
                  <ListFilter className="text-muted-foreground max-sm:hidden" aria-hidden />
                  <SelectValue placeholder="All assignments" className={SELECT_VALUE_CLASS}>
                    <span className="truncate">{filterLabel}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" className="max-w-[min(32rem,calc(100vw-2rem))]">
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
                <SelectTrigger className={cn(PILL_SELECT, "shrink-0 sm:w-52")} aria-label="Sort the queue">
                  <ArrowUpDown className="text-muted-foreground max-sm:hidden" aria-hidden />
                  <SelectValue className={SELECT_VALUE_CLASS}>
                    <span className="truncate">{SORT_LABELS[sort]}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="recheck">{SORT_DESCRIPTIONS.recheck}</SelectItem>
                  <SelectItem value="confidence">{SORT_DESCRIPTIONS.confidence}</SelectItem>
                  <SelectItem value="oldest">{SORT_DESCRIPTIONS.oldest}</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
          </div>
        ) : null}

        <div className="flex w-full min-w-0 items-center gap-1 sm:ml-auto sm:w-auto">
          {current ? (
            <StudentSwitcher
              current={current}
              queue={queue}
              labels={labels}
              totals={totals}
              sort={sort}
              position={position}
              onSelect={onSelect}
              onPrevious={onPrevious}
              onNext={onNext}
              open={queueOpen}
              onOpenChange={onQueueOpenChange}
            />
          ) : null}

          {onSwapPaperSide ? (
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Side by side only exists from lg up, so the control does too. */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onSwapPaperSide}
                  className="hidden shrink-0 lg:inline-flex"
                  aria-label={swapLabel}
                >
                  {paperSide === "left" ? <PanelRight className="size-5" aria-hidden /> : <PanelLeft className="size-5" aria-hidden />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{swapLabel}. Saved to your layout.</TooltipContent>
            </Tooltip>
          ) : null}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onShowShortcuts}
                className="hidden shrink-0 lg:inline-flex"
                aria-label="Keyboard shortcuts"
              >
                <Keyboard className="size-5" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              Keyboard shortcuts <Kbd className="border-transparent">?</Kbd>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

/**
 * Classroom's student switcher: the current student's avatar and name with
 * previous / next arrows. The name opens the grading list as a popover, so
 * any paper is one click away even without the wide-screen rail.
 */
function StudentSwitcher({
  current,
  queue,
  labels,
  totals,
  sort,
  position,
  onSelect,
  onPrevious,
  onNext,
  open,
  onOpenChange,
}: {
  current: ReviewItem;
  queue: ReviewItem[];
  labels: Map<string, string>;
  totals: Map<string, string>;
  sort: QueueSort;
  position: number;
  onSelect: (id: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Radix renders the popover as role="dialog"; name it after its visible heading.
  const headingId = useId();
  // aria-disabled, not disabled, at either end of the queue: the arrow that
  // just took the teacher there keeps focus instead of dropping it to the page.
  const atStart = position <= 1;
  const atEnd = position >= queue.length;
  // Only the arrow fades: the focus ring stays at full strength (it keeps focus at the end of the queue).
  const endClass = "cursor-default text-muted-foreground/50 hover:bg-transparent hover:text-muted-foreground/50";
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 sm:flex-none">
      {/* Says which paper is open after J/K, the arrows or the list. It stays
          mounted across papers, so only a change is announced, not the page load. */}
      <p role="status" className="sr-only">
        {`Paper ${position} of ${queue.length}: ${current.student.name}, ${current.assignment.title}`}
      </p>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              if (!atStart) onPrevious();
            }}
            aria-disabled={atStart || undefined}
            className={cn(atStart && endClass)}
            aria-label="Previous paper"
          >
            <ChevronLeft className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          Previous <Kbd className="border-transparent">K</Kbd>
        </TooltipContent>
      </Tooltip>

      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-border bg-card pr-3 pl-1.5 text-left transition-colors outline-none hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring data-[state=open]:bg-primary-soft/60 sm:w-64 sm:flex-none"
            aria-label={`Paper ${position} of ${queue.length}: ${current.student.name}. Jump to another paper`}
          >
            <Avatar name={current.student.name} className="size-9 bg-primary-soft text-[0.8125rem] text-primary-soft-foreground ring-0" />
            <span className="min-w-0 flex-1" aria-hidden>
              <span className="block truncate text-sm font-medium text-foreground">{current.student.name}</span>
              <span className="tabular block truncate text-xs text-muted-foreground">
                {position} of {queue.length}
                <span> · </span>
                {labels.get(current.assignment.id) ?? current.assignment.title}
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          aria-labelledby={headingId}
          className="w-[min(24rem,calc(100vw-2rem))] rounded-xl p-0"
        >
          <div className="flex items-baseline justify-between gap-2 border-b border-border px-4 py-3">
            <p id={headingId} className="font-display text-sm font-semibold text-foreground">
              {pluralize(queue.length, "paper")} to review
            </p>
            <p className="truncate text-xs text-muted-foreground">{SORT_DESCRIPTIONS[sort]}</p>
          </div>
          <QueueList
            items={queue}
            labels={labels}
            totals={totals}
            currentId={current.id}
            onSelect={(id) => {
              onSelect(id);
              onOpenChange(false);
            }}
            className="max-h-[min(60dvh,26rem)] overflow-y-auto overscroll-contain p-2"
          />
        </PopoverContent>
      </Popover>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              if (!atEnd) onNext();
            }}
            aria-disabled={atEnd || undefined}
            className={cn(atEnd && endClass)}
            aria-label="Next paper"
          >
            <ChevronRight className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          Next <Kbd className="border-transparent">J</Kbd>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
