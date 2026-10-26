"use client";

import { Select as SelectPrimitive } from "radix-ui";

import { BUILDER_TEMPLATES } from "@/components/assignments/builder-templates";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AssignmentKind } from "@/lib/constants";

const GROUPS: { kind: AssignmentKind; label: string }[] = [
  { kind: "ESSAY", label: "Essays" },
  { kind: "TEST", label: "Handwritten tests" },
];

/**
 * "Start from a template": fills the prompt and rubric (or the directions and
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
    <div className="grid gap-2">
      <p id="template-label" className="text-sm leading-none font-medium text-foreground">
        Start from a template
      </p>
      <Select value={value} onValueChange={onApply} disabled={disabled}>
        <SelectTrigger className="w-full" aria-labelledby="template-label" aria-describedby="template-hint">
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
      <p id="template-hint" className="text-xs text-pretty text-muted-foreground">
        {kind === "TEST"
          ? "Fills in the directions and an answer key. You can edit everything."
          : "Fills in the prompt and a rubric. You can edit everything."}
      </p>
    </div>
  );
}
