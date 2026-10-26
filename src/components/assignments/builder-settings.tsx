"use client";

import { ShieldCheck } from "lucide-react";

import { KindPicker } from "@/components/assignments/kind-picker";
import { errorId, fieldA11y, type BuilderCopy } from "@/components/assignments/rubric-draft";
import { TemplatePicker } from "@/components/assignments/template-picker";
import { FieldError } from "@/components/classes/form-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AssignmentKind } from "@/lib/constants";
import { pluralize } from "@/lib/format";
import type { FieldErrors } from "@/lib/validation/form";

/**
 * The settings panel beside the assignment form, like the right-hand panel
 * on Google Classroom's create screen: type, template, points, and due date.
 * Points are the sum of the rubric (or the questions), so they update live.
 */
export function BuilderSettings({
  kind,
  onKindChange,
  templateId,
  onApplyTemplate,
  dueDate,
  onDueDateChange,
  errors,
  totalPoints,
  itemCount,
  copy,
  disabled,
}: {
  kind: AssignmentKind;
  onKindChange: (kind: AssignmentKind) => void;
  templateId: string;
  onApplyTemplate: (templateId: string) => void;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  errors: FieldErrors;
  totalPoints: number;
  itemCount: number;
  copy: BuilderCopy;
  disabled: boolean;
}) {
  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-card">
      <div className="p-5">
        <KindPicker value={kind} onChange={onKindChange} disabled={disabled} />
      </div>

      <div className="p-5">
        <TemplatePicker value={templateId} kind={kind} onApply={onApplyTemplate} disabled={disabled} />
      </div>

      <div className="p-5">
        <p className="text-sm leading-none font-medium text-foreground">Points</p>
        <p className="mt-3 flex items-baseline gap-2" aria-live="polite">
          <span className="tabular font-display text-[32px] leading-none text-foreground">{totalPoints}</span>
          <span className="tabular text-sm text-muted-foreground">
            from {pluralize(itemCount, copy.noun, copy.nounPlural)}
          </span>
        </p>
      </div>

      <div className="grid gap-2 p-5">
        <Label htmlFor="assignment-due">
          Due <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="assignment-due"
          type="date"
          value={dueDate}
          onChange={(event) => onDueDateChange(event.target.value)}
          disabled={disabled}
          className="w-full"
          {...fieldA11y(errors, "dueDate")}
        />
        <FieldError id={errorId("dueDate")} message={errors.dueDate} />
      </div>

      <p className="flex items-start gap-2 p-5 text-[13px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
        AI scores are suggestions. A grade reaches the student only when you choose Approve &amp; return.
      </p>
    </div>
  );
}
