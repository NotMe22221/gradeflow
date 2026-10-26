"use client";

import { ChevronLeft, ChevronRight, FlaskConical, ImagePlus, X } from "@/components/icons";

import type { ScanPage } from "@/components/scan/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Thumbnails of the scan's pages, in upload order, with reorder and remove. */
export function PageList({
  pages,
  maxPages,
  onMove,
  onRemove,
  onAdd,
  disabled = false,
}: {
  pages: ScanPage[];
  maxPages: number;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  disabled?: boolean;
}) {
  const canAdd = pages.length < maxPages && !disabled;

  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Test pages">
      {pages.map((page, index) => {
        const number = index + 1;
        return (
          <li key={page.id} className="group min-w-0">
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-muted">
              {/* Plain <img>: a local object URL, so next/image does not apply. */}
              <img src={page.url} alt={`Page ${number} of the test`} className="size-full object-cover" />
              <span className="tabular absolute top-2 left-2 rounded-full bg-card px-2.5 py-0.5 text-[0.6875rem] font-medium text-foreground shadow-hover">
                Page {number}
              </span>
              {page.sampleId ? (
                <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-card/90 px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
                  <FlaskConical className="size-3" aria-hidden />
                  Sample
                </span>
              ) : page.resized ? (
                <span className="absolute bottom-2 left-2 rounded-full bg-card/90 px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
                  Resized
                </span>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => onRemove(index)}
                disabled={disabled}
                aria-label={`Remove page ${number}`}
                className="absolute top-1.5 right-1.5 size-8 rounded-full border-transparent bg-card text-foreground shadow-hover after:absolute after:-inset-1.5 after:content-['']"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onMove(index, -1)}
                disabled={disabled || index === 0}
                aria-label={`Move page ${number} earlier`}
              >
                <ChevronLeft />
              </Button>
              <span className="truncate text-[0.6875rem] text-muted-foreground" title={page.name}>
                {page.width > 0 ? (
                  <span className="tabular">
                    {page.width}×{page.height}
                  </span>
                ) : (
                  page.name
                )}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onMove(index, 1)}
                disabled={disabled || index === pages.length - 1}
                aria-label={`Move page ${number} later`}
              >
                <ChevronRight />
              </Button>
            </div>
          </li>
        );
      })}
      {canAdd ? (
        <li className="min-w-0">
          <button
            type="button"
            onClick={onAdd}
            className={cn(
              "flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input/30 bg-background text-sm text-muted-foreground transition-colors outline-none",
              "hover:border-primary/50 hover:bg-primary-soft/40 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
              <ImagePlus className="size-5" aria-hidden />
            </span>
            <span className="font-medium">Add page {pages.length + 1}</span>
          </button>
        </li>
      ) : null}
    </ol>
  );
}
