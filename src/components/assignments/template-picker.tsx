"use client";

import { LayoutTemplate } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";

import { BUILDER_TEMPLATES } from "@/components/assignments/builder-templates";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AssignmentKind } from "@/lib/constants";

const GROUPS: { kind: AssignmentKind; label: string }[] = [
  { kind: "ESSAY", label: "Essays" },
  { kind: "TEST", label: "Handwritten tests" },
];

/**
 * "Start from a template": fills the prompt and rubric (or the questions and
 * answer key) from a demo template. Applying a template also sets its kind.
 * The current kind's templates are listed first.
 */
export function TemplatePicker({
  value,
  kind,
  onApply,
  disabled,
}: {
  value: string;
  kind: AssignmentKind;
  onApply: (templateId: string) => void;
  disabled?: boolean;
}) {
  const groups = [...GROUPS].sort((a, b) => Number(b.kind === kind) - Number(a.kind === kind));
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground ring-1 ring-border">
          <LayoutTemplate className="size-4" aria-hidden />
        </div>
        <div className="space-y-0.5">
          <p id="template-label" className="text-sm font-medium text-foreground">
            Start from a template
          </p>
          <p className="text-[13px] text-pretty text-muted-foreground">
            {kind === "TEST"
              ? "Fills in the directions and a ready-to-use answer key. You can edit everything."
              : "Fills in the prompt and a ready-to-use rubric. You can edit everything."}
          </p>
        </div>
      </div>
      <Select value={value} onValueChange={onApply} disabled={disabled}>
        <SelectTrigger className="w-full sm:w-56" aria-labelledby="template-label">
          <SelectValue placeholder="Choose a template" />
        </SelectTrigger>
        <SelectContent>
          {groups.map((group) => (
            <SelectGroup key={group.kind}>
              <SelectPrimitive.Label className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                {group.label}
              </SelectPrimitive.Label>
              {BUILDER_TEMPLATES.filter((template) => template.kind === group.kind).map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
