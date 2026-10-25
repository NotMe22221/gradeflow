"use client";

import { LayoutTemplate } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RUBRIC_TEMPLATES } from "@/lib/demo/templates";

/** "Start from a template": fills the prompt and rubric from a demo template. */
export function TemplatePicker({
  value,
  onApply,
  disabled,
}: {
  value: string;
  onApply: (templateId: string) => void;
  disabled?: boolean;
}) {
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
            Fills in the prompt and a ready-to-use rubric. You can edit everything.
          </p>
        </div>
      </div>
      <Select value={value} onValueChange={onApply} disabled={disabled}>
        <SelectTrigger className="w-full sm:w-52" aria-labelledby="template-label">
          <SelectValue placeholder="Choose a template" />
        </SelectTrigger>
        <SelectContent>
          {RUBRIC_TEMPLATES.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
