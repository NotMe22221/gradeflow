"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, LayoutTemplate, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createAssignment } from "@/app/(teacher)/classes/actions";
import {
  assignmentInputSchema,
  fieldErrorsFromIssues,
  parseDateOnly,
  RUBRIC_LIMITS,
  type FieldErrors,
} from "@/components/assignments/rubric-schema";
import { FieldError, FormAlert } from "@/components/classes/form-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { getRubricTemplate, RUBRIC_TEMPLATES } from "@/lib/demo/templates";
import { formatDate, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

type CriterionDraft = { key: string; title: string; description: string; maxPoints: string };

type Snapshot = { title: string; instructions: string; criteria: CriterionDraft[]; templateId: string };

const FORM_ERROR = "Some fields need attention before you can save.";

function parsePoints(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function validPoints(value: string): number {
  const points = parsePoints(value);
  return Number.isInteger(points) && points >= RUBRIC_LIMITS.minPoints && points <= RUBRIC_LIMITS.maxPoints
    ? points
    : 0;
}

function withoutKeys(errors: FieldErrors, predicate: (key: string) => boolean): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([key]) => !predicate(key)));
}

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

  function updateCriterion(index: number, field: "title" | "description" | "maxPoints", value: string) {
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

  const describedBy = (key: string) => (errors[key] ? `${key.replaceAll(".", "-")}-error` : undefined);
  const errorId = (key: string) => `${key.replaceAll(".", "-")}-error`;
  const invalid = (key: string) => (errors[key] ? true : undefined);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
    >
      <div className="min-w-0 space-y-6">
        {formError ? <FormAlert>{formError}</FormAlert> : null}

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
          <Select value={templateId} onValueChange={applyTemplate} disabled={pending}>
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
                aria-invalid={invalid("title")}
                aria-describedby={describedBy("title")}
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
                aria-invalid={invalid("instructions")}
                aria-describedby={["assignment-instructions-hint", describedBy("instructions")].filter(Boolean).join(" ")}
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
                aria-invalid={invalid("dueDate")}
                aria-describedby={describedBy("dueDate")}
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
              {criteria.map((criterion, index) => {
                const base = `criteria.${index}`;
                const number = index + 1;
                return (
                  <li key={criterion.key} className="rounded-lg border border-border bg-background/60 p-4 sm:p-5">
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
                          onClick={() => moveCriterion(index, -1)}
                          disabled={index === 0 || pending}
                          aria-label={`Move criterion ${number} up`}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => moveCriterion(index, 1)}
                          disabled={index === criteria.length - 1 || pending}
                          aria-label={`Move criterion ${number} down`}
                        >
                          <ArrowDown />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeCriterion(index)}
                          disabled={criteria.length <= RUBRIC_LIMITS.minCriteria || pending}
                          aria-label={`Remove criterion ${number}`}
                          className="hover:text-destructive"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7.5rem]">
                      <div className="grid gap-2">
                        <Label htmlFor={`criterion-${criterion.key}-title`}>Title</Label>
                        <Input
                          id={`criterion-${criterion.key}-title`}
                          value={criterion.title}
                          onChange={(event) => updateCriterion(index, "title", event.target.value)}
                          placeholder="Evidence and reasoning"
                          maxLength={RUBRIC_LIMITS.criterionTitleMax}
                          autoComplete="off"
                          aria-invalid={invalid(`${base}.title`)}
                          aria-describedby={describedBy(`${base}.title`)}
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
                          onChange={(event) => updateCriterion(index, "maxPoints", event.target.value)}
                          className="tabular"
                          aria-invalid={invalid(`${base}.maxPoints`)}
                          aria-describedby={describedBy(`${base}.maxPoints`)}
                        />
                        <FieldError id={errorId(`${base}.maxPoints`)} message={errors[`${base}.maxPoints`]} />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2">
                      <Label htmlFor={`criterion-${criterion.key}-description`}>What full credit looks like</Label>
                      <Textarea
                        id={`criterion-${criterion.key}-description`}
                        value={criterion.description}
                        onChange={(event) => updateCriterion(index, "description", event.target.value)}
                        placeholder="Supports every claim with specific evidence and explains how it proves the point."
                        maxLength={RUBRIC_LIMITS.criterionDescriptionMax}
                        className="max-h-60 min-h-20"
                        aria-invalid={invalid(`${base}.description`)}
                        aria-describedby={describedBy(`${base}.description`)}
                      />
                      <FieldError id={errorId(`${base}.description`)} message={errors[`${base}.description`]} />
                    </div>
                  </li>
                );
              })}
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

      <aside className="hidden lg:sticky lg:top-20 lg:block" aria-label="Rubric summary">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>
              <h2>Summary</h2>
            </CardTitle>
            <CardDescription>Updates as you build the rubric.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="tabular text-3xl font-semibold tracking-tight text-foreground">{totalPoints}</p>
                <p className="text-[13px] text-muted-foreground">total points</p>
              </div>
              <div>
                <p className="tabular text-3xl font-semibold tracking-tight text-foreground">{criteria.length}</p>
                <p className="text-[13px] text-muted-foreground">{criteria.length === 1 ? "criterion" : "criteria"}</p>
              </div>
            </div>
            <ul className="space-y-3">
              {criteria.map((criterion, index) => {
                const points = validPoints(criterion.maxPoints);
                return (
                  <li key={criterion.key} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span
                        className={cn(
                          "min-w-0 truncate",
                          criterion.title.trim() ? "text-foreground" : "text-muted-foreground italic"
                        )}
                      >
                        {criterion.title.trim() || `Criterion ${index + 1}`}
                      </span>
                      <span className="tabular shrink-0 text-muted-foreground">{points || "–"} pts</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-muted-foreground/40 transition-[width] duration-300"
                        style={{ width: totalPoints > 0 ? `${(points / totalPoints) * 100}%` : "0%" }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <Separator />
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Due</dt>
              <dd className="text-right text-foreground">{dueLabel ?? "No due date"}</dd>
              <dt className="text-muted-foreground">Template</dt>
              <dd className="truncate text-right text-foreground">
                {getRubricTemplate(templateId)?.name ?? "None"}
              </dd>
            </dl>
            <p className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2.5 text-[13px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
              AI scores are suggestions. A grade publishes only when you approve it.
            </p>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
