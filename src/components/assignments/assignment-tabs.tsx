"use client";

import { useState } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export type AssignmentTab = "student-work" | "instructions";

const TABS: { value: AssignmentTab; label: string }[] = [
  { value: "student-work", label: "Student work" },
  { value: "instructions", label: "Instructions" },
];

/**
 * Google Classroom's assignment tabs (Student work | Instructions) with the
 * underline indicator. Client-side tabs, so switching never reloads the page
 * or interrupts a running AI pass; the choice is mirrored in `?tab=` so a
 * tab can be linked to.
 */
export function AssignmentTabs({
  initialTab,
  studentWork,
  instructions,
}: {
  initialTab: AssignmentTab;
  studentWork: React.ReactNode;
  instructions: React.ReactNode;
}) {
  const [tab, setTab] = useState<AssignmentTab>(initialTab);

  function change(value: string) {
    const next: AssignmentTab = value === "instructions" ? "instructions" : "student-work";
    setTab(next);
    try {
      const url = new URL(window.location.href);
      if (next === "instructions") url.searchParams.set("tab", "instructions");
      else url.searchParams.delete("tab");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // The URL is a convenience; the tab still switches.
    }
  }

  return (
    <TabsPrimitive.Root value={tab} onValueChange={change}>
      <TabsPrimitive.List
        aria-label="Assignment sections"
        className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0"
      >
        {TABS.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              "relative inline-flex h-12 shrink-0 items-center rounded-t-md px-4 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-foreground/[0.04] hover:text-foreground focus-visible:bg-primary/[0.08] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
              "data-[state=active]:text-primary",
              "after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-transparent data-[state=active]:after:bg-primary"
            )}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      <TabsPrimitive.Content value="student-work" className="outline-none">
        {studentWork}
      </TabsPrimitive.Content>
      <TabsPrimitive.Content value="instructions" className="outline-none">
        {instructions}
      </TabsPrimitive.Content>
    </TabsPrimitive.Root>
  );
}
