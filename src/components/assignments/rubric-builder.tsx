"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { createAssignment } from "@/app/(teacher)/classes/actions";
import { AnswerKeyImport } from "@/components/assignments/answer-key-import";
import { getBuilderTemplate } from "@/components/assignments/builder-templates";
import { BuilderSettings } from "@/components/assignments/builder-settings";
import { CriterionFieldset } from "@/components/assignments/criterion-fieldset";
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
import { FieldError, FormAlert } from "@/components/classes/form-feedback";
import { AssignmentIcon } from "@/components/classwork/assignment-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AssignmentKind } from "@/lib/constants";
import { pluralize } from "@/lib/format";
import { answerKeyToCriteria, type AnswerKeyEngine, type AnswerKeySuccess } from "@/lib/scan/answer-key";
import { parseAssignmentInput, rubricLimitsFor } from "@/lib/validation/assignment";
import { fieldErrorsFromIssues, type FieldErrors } from "@/lib/validation/form";

type Snapshot = {
  kind: AssignmentKind;
  title: string;
  instructions: string;
  criteria: CriterionDraft[];
  templateId: string;
};

const HEADINGS: Record<AssignmentKind, { title: string; description: string }> = {
  ESSAY: {
    title: "New assignment",
    description: "Write the prompt and the rubric. The AI grades against exactly what you write here, and you approve every grade.",
  },
  TEST: {
    title: "New handwritten test",
    description:
      "Write the directions and the answer key, or import the key from a photo. The AI reads each scanned test against it, and you approve every grade.",
  },
};

/** Points on the first, empty item: an essay criterion is worth more than one question. */
const INITIAL_POINTS: Record<AssignmentKind, string> = { ESSAY: "10", TEST: "2" };

const FORM_ERROR = "Some fields need attention before you can save.";

function withoutKeys(errors: FieldErrors, predicate: (key: string) => boolean): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([key]) => !predicate(key)));
}

/**
 * Assignment + rubric form, laid out like Google Classroom's create screen:
 * the title and instructions card, a settings panel on the right (points,
 * due date, type, template), and the rubric (or questions and answer key)
 * below. Exactly one "Create assignment" button shows at a time, so it is
 * always reachable without scrolling back up: when the content area is wide
 * enough for two columns (`@4xl`, measured on the `<main>` container so the
 * open drawer counts) it sits at the top of the sticky settings panel, top
 * right like Classroom's Assign; in one column it closes the form. Holds all
 * form state; the settings panel, answer-key import, and each criterion are
 * presentational children. For a handwritten test (kind TEST) the criteria
 * read as questions, and the description is the answer key.
 */
export function RubricBuilder({
  classId,
  classColor,
  initialKind = "ESSAY",
  answerKeyEngine,
}: {
  classId: string;
  /** The class color for the header icon (classTheme(klass).color). */
  classColor: string;
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
  const heading = HEADINGS[kind];
  const classworkHref = `/classes/${encodeURIComponent(classId)}/classwork`;

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

  const submitLabel = pending ? "Creating…" : "Create assignment";
  const submitIcon = pending ? <Loader2 className="animate-spin" aria-hidden /> : null;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <div className="mb-6 flex items-start gap-4 sm:mb-8">
        <AssignmentIcon isTest={kind === "TEST"} color={classColor} className="mt-0.5 size-12 [&_svg]:size-6" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <h1 className="text-[26px] leading-tight font-medium text-balance text-foreground sm:text-[28px]">
            {heading.title}
          </h1>
          <p className="max-w-2xl text-[15px] text-pretty text-muted-foreground">{heading.description}</p>
        </div>
      </div>

      {formError ? <FormAlert className="mb-6">{formError}</FormAlert> : null}

      {/* Container queries, not viewport ones: with the 288px drawer open, a 1024px window leaves too little room for two columns. */}
      <div className="grid gap-6 @4xl:grid-cols-[minmax(0,1fr)_20rem] @4xl:items-start @4xl:gap-8">
        <div className="grid min-w-0 gap-6 rounded-xl border border-border bg-card p-4 sm:p-6 @4xl:col-start-1 @4xl:row-start-1">
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
              className="h-12 text-base"
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
              className={kind === "TEST" ? "max-h-[28rem] min-h-28" : "max-h-[28rem] min-h-40"}
              aria-invalid={errors.instructions ? true : undefined}
              aria-describedby={["assignment-instructions-hint", errors.instructions ? errorId("instructions") : null]
                .filter(Boolean)
                .join(" ")}
            />
            <FieldError id={errorId("instructions")} message={errors.instructions} />
          </div>
        </div>

        {/* Below the tab bar (sticky at top-16, about 48px tall), so it sticks at top-32. */}
        <aside
          aria-label="Assignment settings"
          className="min-w-0 @4xl:sticky @4xl:top-32 @4xl:col-start-2 @4xl:row-span-2 @4xl:row-start-1 @4xl:self-start"
        >
          {/* Two columns: the actions ride at the top of the sticky panel, so Create stays in view on a long rubric. */}
          <div className="mb-4 hidden items-center justify-end gap-2 @4xl:flex">
            <Button type="button" variant="text" asChild>
              <Link href={classworkHref}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={pending}>
              {submitIcon}
              {submitLabel}
            </Button>
          </div>
          <BuilderSettings
            kind={kind}
            onKindChange={changeKind}
            templateId={templateId}
            onApplyTemplate={applyTemplate}
            dueDate={dueDate}
            onDueDateChange={(value) => {
              setDueDate(value);
              clearError("dueDate");
            }}
            errors={errors}
            totalPoints={totalPoints}
            itemCount={criteria.length}
            copy={copy}
            disabled={pending}
          />
        </aside>

        <section aria-labelledby="rubric-heading" className="min-w-0 space-y-4 @4xl:col-start-1 @4xl:row-start-2">
          <div className="flex items-end justify-between gap-4 px-1 pt-2">
            <div className="min-w-0 space-y-1">
              <h2 id="rubric-heading" className="text-[22px] leading-tight font-normal text-foreground">
                {copy.sectionTitle}
              </h2>
              <p className="max-w-2xl text-sm text-pretty text-muted-foreground">{copy.sectionDescription}</p>
            </div>
            <span className="tabular shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
              {criteria.length}/{limits.maxCriteria}
            </span>
          </div>

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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="tonal" onClick={addCriterion} disabled={atMax || pending} className="self-start">
              <Plus aria-hidden />
              {copy.addLabel}
            </Button>
            <p className="px-1 text-[13px] text-muted-foreground">
              {criteria.length > limits.maxCriteria
                ? `Remove ${pluralize(criteria.length - limits.maxCriteria, copy.noun, copy.nounPlural)} to save: the limit is ${limits.maxCriteria}.`
                : atMax
                  ? `That's the maximum of ${limits.maxCriteria} ${copy.nounPlural}.`
                  : `Up to ${limits.maxCriteria} ${copy.nounPlural}, ${limits.minPoints} to ${limits.maxPoints} points each.`}
            </p>
          </div>
        </section>

        {/* One column (phones, tablets, and laptops with the drawer open): the actions close the form, where a long rubric ends.
            Phones stack them full width with Create first; from md the summary sits left and Cancel, Create sit right. */}
        <div className="flex flex-col gap-2 border-t border-border pt-6 md:flex-row md:items-center md:justify-end @4xl:hidden">
          <p className="tabular text-center text-sm text-muted-foreground md:mr-auto md:text-left">
            {pluralize(criteria.length, copy.noun, copy.nounPlural)} · {pluralize(totalPoints, "point")}
          </p>
          <Button type="submit" disabled={pending} className="w-full md:order-2 md:w-auto">
            {submitIcon}
            {submitLabel}
          </Button>
          <Button type="button" variant="text" asChild className="w-full md:order-1 md:w-auto">
            <Link href={classworkHref}>Cancel</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
