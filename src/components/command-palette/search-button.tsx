"use client";

import { forwardRef } from "react";

import { useModifierLabel } from "@/components/command-palette/use-modifier-label";
import { Search } from "@/components/icons";
import { Kbd } from "@/components/ui/kbd";
import { SEARCH_LABELS } from "@/lib/search/catalog";
import { searchShortcutHint } from "@/lib/search/shortcut";
import type { SearchRole } from "@/lib/search/types";
import { cn } from "@/lib/utils";

/**
 * The app bar's search field: a full-width pill from 600px ("Search classes,
 * assignments, students" with a "Ctrl K" or "⌘K" hint), an icon button on
 * phones. Either way it opens the command palette; it starts loading the
 * index on hover or focus so results are ready on open.
 */
export const SearchButton = forwardRef<
  HTMLButtonElement,
  { role: SearchRole; open: boolean; onOpen: () => void; onPrefetch?: () => void; className?: string }
>(function SearchButton({ role, open, onOpen, onPrefetch, className }, ref) {
  const label = SEARCH_LABELS[role];
  const modifier = useModifierLabel();
  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      onPointerEnter={onPrefetch}
      onFocus={onPrefetch}
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-keyshortcuts="Control+K Meta+K"
      className={cn(
        "group flex shrink-0 items-center rounded-full text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden",
        // Contrast themes drop the tonal fill: keep the field's outline.
        "forced-colors:border",
        // Phones: a 40px icon button.
        "size-10 justify-center hover:bg-foreground/[0.06]",
        // From 600px: a search field.
        "min-[37.5rem]:h-11 min-[37.5rem]:w-auto min-[37.5rem]:min-w-0 min-[37.5rem]:flex-1 min-[37.5rem]:shrink min-[37.5rem]:justify-start min-[37.5rem]:gap-3 min-[37.5rem]:bg-secondary min-[37.5rem]:pr-2.5 min-[37.5rem]:pl-4 min-[37.5rem]:hover:bg-accent",
        className
      )}
    >
      <Search className="size-5 shrink-0 min-[37.5rem]:text-muted-foreground" aria-hidden />
      <span aria-hidden className="hidden min-w-0 flex-1 truncate text-left text-[0.9375rem] min-[37.5rem]:block">
        {label}
      </span>
      <Kbd aria-hidden className="hidden shrink-0 border-border bg-card whitespace-nowrap min-[37.5rem]:inline-flex">
        {searchShortcutHint(modifier)}
      </Kbd>
    </button>
  );
});
