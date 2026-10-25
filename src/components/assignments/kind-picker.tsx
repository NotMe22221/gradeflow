"use client";

import { FileText, PenLine } from "lucide-react";

import type { AssignmentKind } from "@/lib/constants";
import { cn } from "@/lib/utils";

const OPTIONS: { value: AssignmentKind; label: string; hint: string; icon: typeof FileText }[] = [
  { value: "ESSAY", label: "Essay", hint: "Typed papers graded against a rubric.", icon: FileText },
  {
    value: "TEST",
    label: "Handwritten test",
    hint: "Paper tests you photograph. The AI reads the handwriting.",
    icon: PenLine,
  },
];

/**
 * Segmented control for the assignment kind. Native radio inputs, so arrow
 * keys, focus, and screen readers work without extra code.
 */
export function KindPicker({
  value,
  onChange,
  disabled,
}: {
  value: AssignmentKind;
  onChange: (kind: AssignmentKind) => void;
  disabled?: boolean;
}) {
  const active = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];
  return (
    <fieldset className="grid gap-2" disabled={disabled}>
      <legend className="mb-2 text-sm leading-none font-medium text-foreground">Type</legend>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:w-fit sm:min-w-96">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "relative flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
                checked ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <input
                type="radio"
                name="assignment-kind"
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <Icon className="size-4 shrink-0" aria-hidden />
              {option.label}
            </label>
          );
        })}
      </div>
      <p className="text-[13px] text-muted-foreground" aria-live="polite">
        {active.hint}
      </p>
    </fieldset>
  );
}
