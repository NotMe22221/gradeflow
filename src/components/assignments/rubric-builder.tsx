"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { createAssignment } from "@/app/(teacher)/classes/actions";
import { AnswerKeyImport } from "@/components/assignments/answer-key-import";
import { getBuilderTemplate } from "@/components/assignments/builder-templates";
import { CriterionFieldset } from "@/components/assignments/criterion-fieldset";
import { KindPicker } from "@/components/assignments/kind-picker";
import {
  BUILDER_COPY,
  DEFAULT_TEST_DIRECTIONS,
  errorId,
  fieldA11y,
  isBlankCriterion,
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
import type { AssignmentKind } from "@/lib/constants";
import { formatDate, pluralize } from "@/lib/format";
import { answerKeyToCriteria, type AnswerKeyEngine, type AnswerKeySuccess } from "@/lib/scan/answer-key";
import { parseAssignmentInput, parseDateOnly, rubricLimitsFor } from "@/lib/validation/assignment";
import { fieldErrorsFromIssues, type FieldErrors } from "@/lib/validation/form";

type Snapshot = {
  kind: AssignmentKind;
  title: string;
  instructions: string;
  criteria: CriterionDraft[];
  templateId: string;
};

const KIND_LABELS: Record<AssignmentKind, string> = { ESSAY: "Essay", TEST: "Handwritten test" };

/** Points on the first, empty item: an essay criterion is worth more than one question. */
const INITIAL_POINTS: Record<AssignmentKind, string> = { ESSAY: "10", TEST: "2" };

const FORM_ERROR = "Some fields need attention before you can save.";

function withoutKeys(errors: FieldErrors, predicate: (key: string) => boolean): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([key]) => !predicate(key)));
}

/**
 * Assignment + rubric form. Holds all form state; the kind picker, template
 * picker, answer-key import, each criterion, and the summary aside are
 * presentational children. For a handwritten test (kind TEST) the criteria
 * read as questions, and the description is the answer key.
 */
export function RubricBuilder({
  classId,
  initialKind = "ESSAY",
  answerKeyEngine,
}: {
  classId: string;
  initialKind?: AssignmentKind;
  /** Which reader the answer-key import uses on the server (no secrets). */
  answerKeyEngine: AnswerKeyEngine;
}) {
  const keyCounter = useRef(1);
  const focusKey = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [kind, setKind] = useState<AssignmentKind>(initialKind);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [criteria, setCriteria] = useState<CriterionDraft[]>([
    { key: "c0", title: "", description: "", maxPoints: INITIAL_POINTS[initialKind] },
  ]);
  const [templateId, setTemplateId] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const copy = BUILDER_COPY[kind];
  const limits = rubricLimitsFor(kind);
  const totalPoints = criteria.reduce((sum, criterion) => sum + validPoints(criterion.maxPoints), 0);
  const atMax = criteria.length >= limits.maxCriteria;
  const writtenCount = criteria.filter((criterion) => !isBlankCriterion(criterion)).length;
  const dueLabel = dueDate && parseDateOnly(dueDate) ? formatDate(parseDateOnly(dueDate)) : null;

  // Move focus to a newly added criterion, or to the one that took a removed
  // criterion's place, once it is in the DOM.
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
    setCriteria((current) => [...current, { key, title: "", description: "", maxPoints: copy.defaultPoints }]);
    clearCriteriaErrors();
  }

  function removeCriterion(index: number) {
    if (criteria.length <= limits.minCriteria) return;
    // The removed button unmounts; focus the next criterion (or the new last one).
    const remaining = criteria.filter((_, i) => i !== index);
    focusKey.current = remaining[Math.min(index, remaining.length - 1)]?.key ?? null;
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

  function snapshot(): Snapshot {
    return { kind, title, instructions, criteria, templateId };
  }

  function restore(snapshot: Snapshot) {
    setKind(snapshot.kind);
    setTitle(snapshot.title);
    setInstructions(snapshot.instructions);
    setCriteria(snapshot.criteria);
    setTemplateId(snapshot.templateId);
    setErrors({});
    setFormError(null);
  }

  function changeKind(next: AssignmentKind) {
    if (next === kind) return;
    setKind(next);
    // An untouched starter item takes the new kind's starting points.
    setCriteria((current) =>
      current.length === 1 && isBlankCriterion(current[0]) && current[0].maxPoints === INITIAL_POINTS[kind]
        ? [{ ...current[0], maxPoints: INITIAL_POINTS[next] }]
        : current
    );
    // Limits and messages differ by kind: re-validate on the next save.
    setErrors({});
    setFormError(null);
  }

  function applyTemplate(id: string) {
    const template = getBuilderTemplate(id);
    if (!template) return;
    const before = snapshot();
    const hadWork = title.trim() !== "" || instructions.trim() !== "" || writtenCount > 0;

    setKind(template.kind);
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
      action: hadWork ? { label: "Undo", onClick: () => restore(before) } : undefined,
    });
  }

  /** Replace the questions with the ones read from an answer-key photo. */
  function applyAnswerKey(result: AnswerKeySuccess) {
    const before = snapshot();
    const hadWork = writtenCount > 0;
    setKind("TEST");
    setCriteria(
      answerKeyToCriteria(result.questions).map((criterion) => ({
        key: nextKey(),
        title: criterion.title,
        description: criterion.description,
        maxPoints: String(criterion.maxPoints),
      }))
    );
    if (!title.trim() && result.title) setTitle(result.title);
    if (!instructions.trim()) setInstructions(DEFAULT_TEST_DIRECTIONS);
    setTemplateId("");
    setErrors({});
    setFormError(null);
    toast.success(`Imported ${pluralize(result.questions.length, "question")}`, {
      description:
        result.engine === "openai"
          ? "Read by GPT-4o. Check each answer and point value before you save."
          : "Demo: the sample answer key. Edit anything before you save.",
      action: hadWork ? { label: "Undo", onClick: () => restore(before) } : undefined,
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
      kind,
      title,
      instructions,
      dueDate,
      criteria: criteria.map((criterion) => ({
        title: criterion.title,
        description: criterion.description,
        maxPoints: parsePoints(criterion.maxPoints),
      })),
    };
    const check = parseAssignmentInput(payload);
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

        <TemplatePicker value={templateId} kind={kind} onApply={applyTemplate} disabled={pending} />

        <Card>
          <CardHeader className="pb-0">
            <CardTitle>
              <h2>Assignment</h2>
            </CardTitle>
            <CardDescription>
              {kind === "TEST"
                ? "Students see the title and directions with their graded test."
                : "Students see the title and prompt when they submit."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <KindPicker value={kind} onChange={changeKind} disabled={pending} />
            <div className="grid gap-2">
              <Label htmlFor="assignment-title">Title</Label>
              <Input
                id="assignment-title"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  clearError("title");
                }}
                placeholder={copy.assignmentTitlePlaceholder}
                maxLength={limits.titleMax}
                autoComplete="off"
                {...fieldA11y(errors, "title")}
              />
              <FieldError id={errorId("title")} message={errors.title} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assignment-instructions">{copy.instructionsLabel}</Label>
              <p id="assignment-instructions-hint" className="-mt-1 text-[13px] text-muted-foreground">
                {copy.instructionsHint}
              </p>
              <Textarea
                id="assignment-instructions"
                value={instructions}
                onChange={(event) => {
                  setInstructions(event.target.value);
                  clearError("instructions");
                }}
                placeholder={copy.instructionsPlaceholder}
                maxLength={limits.instructionsMax}
                className={kind === "TEST" ? "max-h-[28rem] min-h-24" : "max-h-[28rem] min-h-36"}
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
                <h2>{copy.sectionTitle}</h2>
              </CardTitle>
              <CardDescription className="text-pretty">{copy.sectionDescription}</CardDescription>
            </div>
            <CardAction>
              <Badge variant="secondary" className="tabular">
                {criteria.length}/{limits.maxCriteria}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            {kind === "TEST" ? (
              <AnswerKeyImport
                engine={answerKeyEngine}
                existingCount={writtenCount}
                disabled={pending}
                onApply={applyAnswerKey}
              />
            ) : null}
            <ol className="space-y-4" aria-label={kind === "TEST" ? "Questions" : "Rubric criteria"}>
              {criteria.map((criterion, index) => (
                <CriterionFieldset
                  key={criterion.key}
                  index={index}
                  count={criteria.length}
                  criterion={criterion}
                  errors={errors}
                  disabled={pending}
                  copy={copy}
                  limits={limits}
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
              {copy.addLabel}
            </Button>
            <p className="text-center text-[13px] text-muted-foreground">
              {criteria.length > limits.maxCriteria
                ? `Remove ${pluralize(criteria.length - limits.maxCriteria, copy.noun, copy.nounPlural)} to save: the limit is ${limits.maxCriteria}.`
                : atMax
                  ? `That's the maximum of ${limits.maxCriteria} ${copy.nounPlural}.`
                  : `Up to ${limits.maxCriteria} ${copy.nounPlural}, ${limits.minPoints} to ${limits.maxPoints} points each.`}
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="tabular text-sm text-muted-foreground lg:invisible">
            {pluralize(criteria.length, copy.noun, copy.nounPlural)} · {pluralize(totalPoints, "point")}
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
        templateName={getBuilderTemplate(templateId)?.name ?? null}
        kindLabel={KIND_LABELS[kind]}
        copy={copy}
      />
    </form>
  );
}
