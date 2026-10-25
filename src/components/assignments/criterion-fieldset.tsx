"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { fieldA11y, errorId, type CriterionDraft, type CriterionField } from "@/components/assignments/rubric-draft";
import { FieldError } from "@/components/classes/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RUBRIC_LIMITS } from "@/lib/validation/assignment";
import type { FieldErrors } from "@/lib/validation/form";

/** One rubric criterion in the builder: title, max points, full-credit description. */
export function CriterionFieldset({
  index,
  count,
  criterion,
  errors,
  disabled,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  /** How many criteria the rubric has (for the move and remove limits). */
  count: number;
  criterion: CriterionDraft;
  errors: FieldErrors;
  disabled: boolean;
  onChange: (field: CriterionField, value: string) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const base = `criteria.${index}`;
  const number = index + 1;

  return (
    <li className="rounded-lg border border-border bg-background/60 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="tabular flex size-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground ring-1 ring-border">
            {number}
          </span>
          Criterion {number}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onMove(-1)}
            disabled={index === 0 || disabled}
            aria-label={`Move criterion ${number} up`}
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onMove(1)}
            disabled={index === count - 1 || disabled}
            aria-label={`Move criterion ${number} down`}
          >
            <ArrowDown />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            disabled={count <= RUBRIC_LIMITS.minCriteria || disabled}
            aria-label={`Remove criterion ${number}`}
            className="hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7.5rem]">
        <div className="grid content-start gap-2">
          <Label htmlFor={`criterion-${criterion.key}-title`}>Title</Label>
          <Input
            id={`criterion-${criterion.key}-title`}
            value={criterion.title}
            onChange={(event) => onChange("title", event.target.value)}
            placeholder="Evidence and reasoning"
            maxLength={RUBRIC_LIMITS.criterionTitleMax}
            autoComplete="off"
            {...fieldA11y(errors, `${base}.title`)}
          />
          <FieldError id={errorId(`${base}.title`)} message={errors[`${base}.title`]} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor={`criterion-${criterion.key}-points`}>Max points</Label>
          <Input
            id={`criterion-${criterion.key}-points`}
            type="number"
            inputMode="numeric"
            min={RUBRIC_LIMITS.minPoints}
            max={RUBRIC_LIMITS.maxPoints}
            step={1}
            value={criterion.maxPoints}
            onChange={(event) => onChange("maxPoints", event.target.value)}
            className="tabular"
            {...fieldA11y(errors, `${base}.maxPoints`)}
          />
          <FieldError id={errorId(`${base}.maxPoints`)} message={errors[`${base}.maxPoints`]} />
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        <Label htmlFor={`criterion-${criterion.key}-description`}>What full credit looks like</Label>
        <Textarea
          id={`criterion-${criterion.key}-description`}
          value={criterion.description}
          onChange={(event) => onChange("description", event.target.value)}
          placeholder="Supports every claim with specific evidence and explains how it proves the point."
          maxLength={RUBRIC_LIMITS.criterionDescriptionMax}
          className="max-h-60 min-h-20"
          {...fieldA11y(errors, `${base}.description`)}
        />
        <FieldError id={errorId(`${base}.description`)} message={errors[`${base}.description`]} />
      </div>
    </li>
  );
}
