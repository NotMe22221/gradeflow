"use client";

import { useState, useTransition } from "react";
import { Info, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { addStudent } from "@/app/(teacher)/classes/actions";
import { FieldError, FormAlert } from "@/components/classes/form-feedback";
import { NAME_MAX, studentInputSchema, type FieldErrors, fieldErrorsFromIssues } from "@/components/classes/schemas";
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

const EMPTY = { firstName: "", lastName: "" };

export function AddStudentDialog({
  classId,
  className,
  size = "sm",
  variant = "outline",
}: {
  classId: string;
  className: string;
  size?: "sm" | "default";
  variant?: "outline" | "default";
}) {
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

  function reset() {
    setValues(EMPTY);
    setFieldErrors({});
    setFormError(null);
  }

  function handleOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) reset();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const check = studentInputSchema.safeParse(values);
    if (!check.success) {
      setFieldErrors(fieldErrorsFromIssues(check.error.issues));
      return;
    }
    const formData = new FormData(event.currentTarget);
    setFormError(null);
    startTransition(async () => {
      const result = await addStudent(classId, formData);
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.fieldErrors ? null : result.error);
        return;
      }
      toast.success(`${result.student.name} joined ${className}`, { description: result.student.email });
      setOpen(false);
      reset();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <UserPlus aria-hidden />
          Add student
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a student</DialogTitle>
          <DialogDescription>
            They join {className} with a demo email so you can preview their view.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6" noValidate>
          {formError ? <FormAlert>{formError}</FormAlert> : null}
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="student-first-name">First name</Label>
              <Input
                id="student-first-name"
                name="firstName"
                value={values.firstName}
                onChange={(event) => update("firstName", event.target.value)}
                maxLength={NAME_MAX}
                autoComplete="off"
                autoFocus
                required
                aria-invalid={fieldErrors.firstName ? true : undefined}
                aria-describedby={fieldErrors.firstName ? "student-first-name-error" : undefined}
              />
              <FieldError id="student-first-name-error" message={fieldErrors.firstName} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="student-last-name">Last name</Label>
              <Input
                id="student-last-name"
                name="lastName"
                value={values.lastName}
                onChange={(event) => update("lastName", event.target.value)}
                maxLength={NAME_MAX}
                autoComplete="off"
                required
                aria-invalid={fieldErrors.lastName ? true : undefined}
                aria-describedby={fieldErrors.lastName ? "student-last-name-error" : undefined}
              />
              <FieldError id="student-last-name-error" message={fieldErrors.lastName} />
            </div>
          </div>
          <p className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2.5 text-[13px] text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Demo data only. Use fictional names.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {pending ? "Adding…" : "Add student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
