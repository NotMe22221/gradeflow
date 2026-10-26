"use client";

import { Check, FileText, ScanLine } from "lucide-react";

import type { AssignmentKind } from "@/lib/constants";
import { cn } from "@/lib/utils";

const OPTIONS: { value: AssignmentKind; label: string; hint: string; icon: typeof FileText }[] = [
  { value: "ESSAY", label: "Essay", hint: "Typed papers graded against a rubric", icon: FileText },
  {
    value: "TEST",
    label: "Handwritten test",
    hint: "Paper tests you photograph; the AI reads the handwriting",
    icon: ScanLine,
  },
];

/**
 * The assignment type, as a pair of selectable rows (Material radio cards).
 * Native radio inputs, so arrow keys, focus, and screen readers work without
 * extra code.
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
  return (
    <fieldset className="grid gap-2" disabled={disabled}>
      <legend className="mb-2 text-sm leading-none font-medium text-foreground">Type</legend>
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "relative flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
              checked
                ? "border-transparent bg-primary-soft text-primary-soft-foreground"
                : "border-border bg-card text-foreground hover:bg-foreground/[0.03]"
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
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full",
                checked ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              )}
              aria-hidden
            >
              {checked ? <Check className="size-4" /> : <Icon className="size-4" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{option.label}</span>
              <span className={cn("block text-xs", checked ? "text-primary-soft-foreground/80" : "text-muted-foreground")}>
                {option.hint}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
