"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/*
 * In-page tabs with Classroom's underline indicator (To-do's Assigned /
 * Missing / Done). Same look as PageTabs, for tabs that switch content
 * without navigating. Use with Tabs and TabsContent from ui/tabs.
 *
 * Keyboard focus is a solid inset primary ring (inset because the list
 * scrolls sideways and would clip an outer ring). The 8% tint is only the
 * state layer, like hover.
 */

export function UnderlineTabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]", className)}
      {...props}
    />
  );
}

export function UnderlineTabsTrigger({
  className,
  children,
  count,
  countTone = "neutral",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & {
  count?: number;
  /** "attention" tints a non-zero count (Missing), so it stands out next to the word. */
  countTone?: "neutral" | "attention";
}) {
  const attention = countTone === "attention" && count !== undefined && count > 0;
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "group/tab relative inline-flex h-12 shrink-0 items-center gap-2 rounded-t-md px-4 text-[0.875rem] font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-foreground/[0.04] hover:text-foreground focus-visible:bg-primary/[0.08] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset data-[state=active]:text-primary motion-reduce:transition-none",
        className
      )}
      {...props}
    >
      {children}
      {count !== undefined ? (
        <span
          className={cn(
            "tabular min-w-5 rounded-full px-1.5 text-center text-[0.75rem] leading-[1.25rem] font-semibold",
            attention
              ? "bg-danger-soft text-danger-soft-foreground"
              : "bg-secondary text-muted-foreground group-data-[state=active]/tab:bg-primary-soft group-data-[state=active]/tab:text-primary-soft-foreground"
          )}
        >
          {count}
        </span>
      ) : null}
      <span
        aria-hidden
        className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-primary opacity-0 group-data-[state=active]/tab:opacity-100"
      />
    </TabsPrimitive.Trigger>
  );
}
