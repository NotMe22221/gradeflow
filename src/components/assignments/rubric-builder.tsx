"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { createAssignment } from "@/app/(teacher)/classes/actions";
import { CriterionFieldset } from "@/components/assignments/criterion-fieldset";
import {
  errorId,
  fieldA11y,
  parsePoints,
  validPoints,
  type CriterionDraft,
  type CriterionField,
} from "@/components/assignments/rubric-draft";
import { RubricSummary } from "@/components/assignments/rubric-summary";
import { TemplatePicker } from "@/components/assignments/template-picker";
import { FieldError, FormAlert } from "@/components/classes/form-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getRubricTemplate } from "@/lib/demo/templates";
import { formatDate, pluralize } from "@/lib/format";
import { assignmentInputSchema, parseDateOnly, RUBRIC_LIMITS } from "@/lib/validation/assignment";
import { fieldErrorsFromIssues, type FieldErrors } from "@/lib/validation/form";

type Snapshot = { title: string; instructions: string; criteria: CriterionDraft[]; templateId: string };

const FORM_ERROR = "Some fields need attention before you can save.";

function withoutKeys(errors: FieldErrors, predicate: (key: string) => boolean): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([key]) => !predicate(key)));
}

/**
 * Assignment + rubric form. Holds all form state; the template picker, each
 * criterion, and the summary aside are presentational children.
 */
export function RubricBuilder({ classId }: { classId: string }) {
  const keyCounter = useRef(1);
  const focusKey = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [criteria, setCriteria] = useState<CriterionDraft[]>([
    { key: "c0", title: "", description: "", maxPoints: "10" },
  ]);
  const [templateId, setTemplateId] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalPoints = criteria.reduce((sum, criterion) => sum + validPoints(criterion.maxPoints), 0);
  const atMax = criteria.length >= RUBRIC_LIMITS.maxCriteria;
  const dueLabel = dueDate && parseDateOnly(dueDate) ? formatDate(parseDateOnly(dueDate)) : null;

  // Move focus to a newly added criterion once it is in the DOM.
  useEffect(() => {
    if (!focusKey.current) return;
    document.getElementById(`criterion-${focusKey.current}-title`)?.focus();
    focusKey.current = null;
  }, [criteria]);

  function nextKey() {
    return `c${keyCounter.current++}`;
  }

  function clearError(key: string) {
    if (errors[key]) setErrors((current) => withoutKeys(current, (k) => k === key));
  }

  function clearCriteriaErrors() {
    setErrors((current) => withoutKeys(current, (key) => key === "criteria" || key.startsWith("criteria.")));
  }

  function updateCriterion(index: number, field: CriterionField, value: string) {
    setCriteria((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    clearError(`criteria.${index}.${field}`);
  }

  function addCriterion() {
    if (atMax) return;
    const key = nextKey();
    focusKey.current = key;
    setCriteria((current) => [...current, { key, title: "", description: "", maxPoints: "5" }]);
    clearCriteriaErrors();
  }

  function removeCriterion(index: number) {
    if (criteria.length <= RUBRIC_LIMITS.minCriteria) return;
    setCriteria((current) => current.filter((_, i) => i !== index));
    clearCriteriaErrors();
  }

  function moveCriterion(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= criteria.length) return;
    setCriteria((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    clearCriteriaErrors();
  }

  function restore(snapshot: Snapshot) {
    setTitle(snapshot.title);
    setInstructions(snapshot.instructions);
    setCriteria(snapshot.criteria);
    setTemplateId(snapshot.templateId);
    setErrors({});
    setFormError(null);
  }

  function applyTemplate(id: string) {
    const template = getRubricTemplate(id);
    if (!template) return;
    const snapshot: Snapshot = { title, instructions, criteria, templateId };
    const hadWork =
      title.trim() !== "" ||
      instructions.trim() !== "" ||
      criteria.some((criterion) => criterion.title.trim() !== "" || criterion.description.trim() !== "");

    setTitle(template.title);
    setInstructions(template.instructions);
    setCriteria(
      template.criteria.map((criterion) => ({
        key: nextKey(),
        title: criterion.title,
        description: criterion.description,
        maxPoints: String(criterion.maxPoints),
      }))
    );
    setTemplateId(id);
    setErrors({});
    setFormError(null);
    toast.success(`${template.name} template applied`, {
      description: "Edit anything before you save.",
      action: hadWork ? { label: "Undo", onClick: () => restore(snapshot) } : undefined,
    });
  }

  function focusFirstInvalid() {
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const payload = {
      title,
      instructions,
      dueDate,
      criteria: criteria.map((criterion) => ({
        title: criterion.title,
        description: criterion.description,
        maxPoints: parsePoints(criterion.maxPoints),
      })),
    };
    const check = assignmentInputSchema.safeParse(payload);
    if (!check.success) {
      setErrors(fieldErrorsFromIssues(check.error.issues));
      setFormError(FORM_ERROR);
      focusFirstInvalid();
      return;
    }
    setFormError(null);
    startTransition(async () => {
      // On success the action redirects to the new assignment.
      const result = await createAssignment(classId, check.data);
      if (result && !result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        focusFirstInvalid();
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
    >
      <div className="min-w-0 space-y-6">
        {formError ? <FormAlert>{formError}</FormAlert> : null}

        <TemplatePicker value={templateId} onApply={applyTemplate} disabled={pending} />

        <Card>
          <CardHeader className="pb-0">
            <CardTitle>
              <h2>Assignment</h2>
            </CardTitle>
            <CardDescription>Students see the title and prompt when they submit.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="assignment-title">Title</Label>
              <Input
                id="assignment-title"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  clearError("title");
                }}
                placeholder="Persuasive Essay: Should Our School Start the Day Later?"
                maxLength={RUBRIC_LIMITS.titleMax}
                autoComplete="off"
                {...fieldA11y(errors, "title")}
              />
              <FieldError id={errorId("title")} message={errors.title} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assignment-instructions">Prompt and instructions</Label>
              <p id="assignment-instructions-hint" className="-mt-1 text-[13px] text-muted-foreground">
                The AI reads this alongside the rubric. Include any length or source requirements.
              </p>
              <Textarea
                id="assignment-instructions"
                value={instructions}
                onChange={(event) => {
                  setInstructions(event.target.value);
                  clearError("instructions");
                }}
                placeholder="Write a 350 to 500 word essay that…"
                maxLength={RUBRIC_LIMITS.instructionsMax}
                className="max-h-[28rem] min-h-36"
                aria-invalid={errors.instructions ? true : undefined}
                aria-describedby={["assignment-instructions-hint", errors.instructions ? errorId("instructions") : null]
                  .filter(Boolean)
                  .join(" ")}
              />
              <FieldError id={errorId("instructions")} message={errors.instructions} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assignment-due">
                Due date <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="assignment-due"
                type="date"
                value={dueDate}
                onChange={(event) => {
                  setDueDate(event.target.value);
                  clearError("dueDate");
                }}
                className="w-full sm:w-52"
                {...fieldA11y(errors, "dueDate")}
              />
              <FieldError id={errorId("dueDate")} message={errors.dueDate} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start gap-4 pb-0">
            <div className="min-w-0 space-y-1.5">
              <CardTitle>
                <h2>Rubric</h2>
              </CardTitle>
              <CardDescription className="text-pretty">
                For each criterion, the AI suggests a score, a one to two sentence justification, and a quote
                from the paper as evidence.
              </CardDescription>
            </div>
            <CardAction>
              <Badge variant="secondary" className="tabular">
                {criteria.length}/{RUBRIC_LIMITS.maxCriteria}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-4" aria-label="Rubric criteria">
              {criteria.map((criterion, index) => (
                <CriterionFieldset
                  key={criterion.key}
                  index={index}
                  count={criteria.length}
                  criterion={criterion}
                  errors={errors}
                  disabled={pending}
                  onChange={(field, value) => updateCriterion(index, field, value)}
                  onMove={(direction) => moveCriterion(index, direction)}
                  onRemove={() => removeCriterion(index)}
                />
              ))}
            </ol>
            <FieldError id="criteria-error" message={errors.criteria} />
            <Button
              type="button"
              variant="outline"
              onClick={addCriterion}
              disabled={atMax || pending}
              className="w-full border-dashed shadow-none"
            >
              <Plus aria-hidden />
              Add criterion
            </Button>
            <p className="text-center text-[13px] text-muted-foreground">
              {atMax
                ? `That's the maximum of ${RUBRIC_LIMITS.maxCriteria} criteria.`
                : `Up to ${RUBRIC_LIMITS.maxCriteria} criteria, ${RUBRIC_LIMITS.minPoints} to ${RUBRIC_LIMITS.maxPoints} points each.`}
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="tabular text-sm text-muted-foreground lg:invisible">
            {pluralize(criteria.length, "criterion", "criteria")} · {pluralize(totalPoints, "point")}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" asChild>
              <Link href={`/classes/${classId}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {pending ? "Creating…" : "Create assignment"}
            </Button>
          </div>
        </div>
      </div>

      <RubricSummary
        criteria={criteria}
        totalPoints={totalPoints}
        dueLabel={dueLabel}
        templateName={getRubricTemplate(templateId)?.name ?? null}
      />
    </form>
  );
}
