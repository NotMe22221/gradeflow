"use client";

import { ArrowDown, ArrowUp, Trash2 } from "@/components/icons";

import {
  fieldA11y,
  errorId,
  type BuilderCopy,
  type CriterionDraft,
  type CriterionField,
} from "@/components/assignments/rubric-draft";
import { FieldError } from "@/components/classes/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RubricLimits } from "@/lib/validation/assignment";
import type { FieldErrors } from "@/lib/validation/form";

/**
 * One rubric criterion in the builder: title, max points, full-credit
 * description. For a handwritten test it reads as a question: label,
 * points, and the answer key.
 */
export function CriterionFieldset({
  index,
  count,
  criterion,
  errors,
  disabled,
  copy,
  limits,
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
  copy: BuilderCopy;
  limits: RubricLimits;
  onChange: (field: CriterionField, value: string) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const base = `criteria.${index}`;
  const number = index + 1;

  return (
    <li className="rounded-xl border border-border bg-card p-4 transition-shadow focus-within:shadow-hover sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="flex items-center gap-3 font-display text-[0.9375rem] font-medium text-foreground">
          <span className="tabular flex size-8 items-center justify-center rounded-full bg-primary-soft font-sans text-[0.8125rem] font-semibold text-primary-soft-foreground">
            {number}
          </span>
          {copy.itemLabel} {number}
        </span>
        <div className="-mr-2 flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onMove(-1)}
            disabled={index === 0 || disabled}
            aria-label={`Move ${copy.noun} ${number} up`}
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onMove(1)}
            disabled={index === count - 1 || disabled}
            aria-label={`Move ${copy.noun} ${number} down`}
          >
            <ArrowDown />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={count <= limits.minCriteria || disabled}
            aria-label={`Remove ${copy.noun} ${number}`}
            className="hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7.5rem]">
        <div className="grid content-start gap-2">
          <Label htmlFor={`criterion-${criterion.key}-title`}>{copy.titleLabel}</Label>
          <Input
            id={`criterion-${criterion.key}-title`}
            value={criterion.title}
            onChange={(event) => onChange("title", event.target.value)}
            placeholder={copy.titlePlaceholder}
            maxLength={limits.criterionTitleMax}
            autoComplete="off"
            {...fieldA11y(errors, `${base}.title`)}
          />
          <FieldError id={errorId(`${base}.title`)} message={errors[`${base}.title`]} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor={`criterion-${criterion.key}-points`}>{copy.pointsLabel}</Label>
          <Input
            id={`criterion-${criterion.key}-points`}
            type="number"
            inputMode="numeric"
            min={limits.minPoints}
            max={limits.maxPoints}
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
        <Label htmlFor={`criterion-${criterion.key}-description`}>{copy.descriptionLabel}</Label>
        <Textarea
          id={`criterion-${criterion.key}-description`}
          value={criterion.description}
          onChange={(event) => onChange("description", event.target.value)}
          placeholder={copy.descriptionPlaceholder}
          maxLength={limits.criterionDescriptionMax}
          className="max-h-60 min-h-20"
          {...fieldA11y(errors, `${base}.description`)}
        />
        <FieldError id={errorId(`${base}.description`)} message={errors[`${base}.description`]} />
      </div>
    </li>
  );
}
