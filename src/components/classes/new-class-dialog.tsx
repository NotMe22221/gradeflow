"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";

import { createClass } from "@/app/(teacher)/classes/actions";
import { FieldError, FormAlert } from "@/components/classes/form-feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldErrors } from "@/lib/validation/form";

const EMPTY = { name: "", section: "", subject: "" };

export function NewClassDialog({ variant = "default" }: { variant?: "default" | "outline" }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update(key: keyof typeof EMPTY, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  function handleOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) {
      setValues(EMPTY);
      setFieldErrors({});
      setFormError(null);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.name.trim()) {
      setFieldErrors({ name: "Give the class a name." });
      return;
    }
    const formData = new FormData(event.currentTarget);
    setFormError(null);
    startTransition(async () => {
      // On success the action redirects to the new class.
      const result = await createClass(formData);
      if (result && !result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.fieldErrors ? null : result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <Plus aria-hidden />
          New class
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New class</DialogTitle>
          <DialogDescription>Add the basics now. You can add students and assignments next.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6" noValidate>
          {formError ? <FormAlert>{formError}</FormAlert> : null}
          <div className="grid gap-2">
            <Label htmlFor="class-name">Class name</Label>
            <Input
              id="class-name"
              name="name"
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="English 10"
              maxLength={80}
              autoComplete="off"
              autoFocus
              required
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={fieldErrors.name ? "class-name-error" : undefined}
            />
            <FieldError id="class-name-error" message={fieldErrors.name} />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="class-section">
                Section <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="class-section"
                name="section"
                value={values.section}
                onChange={(event) => update("section", event.target.value)}
                placeholder="Period 3"
                maxLength={40}
                autoComplete="off"
                aria-invalid={fieldErrors.section ? true : undefined}
                aria-describedby={fieldErrors.section ? "class-section-error" : undefined}
              />
              <FieldError id="class-section-error" message={fieldErrors.section} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="class-subject">
                Subject <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="class-subject"
                name="subject"
                value={values.subject}
                onChange={(event) => update("subject", event.target.value)}
                placeholder="English Language Arts"
                maxLength={60}
                autoComplete="off"
                aria-invalid={fieldErrors.subject ? true : undefined}
                aria-describedby={fieldErrors.subject ? "class-subject-error" : undefined}
              />
              <FieldError id="class-subject-error" message={fieldErrors.subject} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {pending ? "Creating…" : "Create class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
