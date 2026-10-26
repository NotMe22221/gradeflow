"use client";

import { useRef, useState, useTransition } from "react";
import { ClipboardPaste, FilePlus2, FileUp, Loader2, ShieldCheck, X } from "@/components/icons";
import { toast } from "sonner";

import { addSubmission } from "@/app/(teacher)/assignments/actions";
import type { EligibleStudent } from "@/components/assignments/types";
import { FieldError, FormAlert } from "@/components/classes/form-feedback";
import { StatusBadge } from "@/components/grading/status-badge";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { firstName, pluralize, wordCount } from "@/lib/format";
import {
  formatBytes,
  MAX_PAPER_CHARS,
  MAX_PAPER_FILE_BYTES,
  normalizePaperText,
  txtFileProblem,
  validatePaperText,
} from "@/lib/paper";
import { cn } from "@/lib/utils";

const PREVIEW_CHARS = 2_000;
const FILE_HINT = `Plain text only, up to ${formatBytes(MAX_PAPER_FILE_BYTES)}`;

type Mode = "paste" | "upload";
type FormError = { message: string; field?: "studentId" | "content" | "file" };

export function AddSubmissionDialog({
  assignmentId,
  students,
  hasRoster,
  defaultStudentId,
  trigger,
  disabled = false,
}: {
  assignmentId: string;
  students: EligibleStudent[];
  hasRoster: boolean;
  defaultStudentId?: string;
  /** Custom trigger element; defaults to an outline "Add submission" button. */
  trigger?: React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState(defaultStudentId ?? "");
  const [mode, setMode] = useState<Mode>("paste");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<FormError | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = students.find((student) => student.id === studentId) ?? null;
  const replacing = selected?.currentStatus ?? null;

  function reset() {
    setStudentId(defaultStudentId ?? "");
    setMode("paste");
    setText("");
    clearFile();
    setError(null);
  }

  function clearFile() {
    setFile(null);
    setPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) reset();
  }

  async function acceptFile(candidate: File | null | undefined) {
    if (!candidate) return;
    const problem = txtFileProblem(candidate);
    if (problem) {
      clearFile();
      setError({ message: problem, field: "file" });
      return;
    }
    try {
      // Read locally for the preview; the file itself is sent with the form.
      const content = await candidate.text();
      // Same rules the server applies after normalizing the upload.
      const textProblem = validatePaperText(normalizePaperText(content));
      if (textProblem) {
        clearFile();
        setError({ message: textProblem, field: "file" });
        return;
      }
      setFile(candidate);
      setPreview(content);
      setError(null);
    } catch {
      clearFile();
      setError({ message: "That file could not be read. Try saving it again as plain text.", field: "file" });
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!studentId) return setError({ message: "Choose a student.", field: "studentId" });
    if (mode === "paste") {
      // Same normalization and limits the server applies.
      const problem = validatePaperText(normalizePaperText(text));
      if (problem) return setError({ message: problem, field: "content" });
    } else if (!file) {
      return setError({ message: "Choose a .txt file to upload.", field: "file" });
    }

    const formData = new FormData();
    formData.set("studentId", studentId);
    formData.set("mode", mode);
    if (mode === "paste") formData.set("content", text);
    else if (file) formData.set("file", file, file.name);

    setError(null);
    startTransition(async () => {
      const result = await addSubmission(assignmentId, formData);
      if (!result.ok) {
        setError({ message: result.error, field: result.field });
        return;
      }
      toast.success(`Paper added for ${result.studentName}`, {
        description: "It is ready for the AI first pass.",
      });
      setOpen(false);
      reset();
    });
  }

  const words = mode === "paste" ? wordCount(text) : wordCount(preview);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild disabled={disabled}>
        {trigger ?? (
          <Button variant="outline" disabled={disabled}>
            <FilePlus2 aria-hidden />
            Add submission
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a submission</DialogTitle>
          <DialogDescription>Add a paper on a student&apos;s behalf. It joins the AI first pass queue.</DialogDescription>
        </DialogHeader>

        {students.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
            {hasRoster
              ? "Every enrolled student already has a published grade for this assignment."
              : "No students are enrolled yet. Add students from the class page first."}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid min-w-0 gap-6" noValidate>
            {error && !error.field ? <FormAlert>{error.message}</FormAlert> : null}

            <div className="grid gap-2">
              <Label htmlFor="submission-student">Student</Label>
              <Select
                value={studentId}
                onValueChange={(value) => {
                  setStudentId(value);
                  if (error?.field === "studentId") setError(null);
                }}
                disabled={pending}
              >
                <SelectTrigger
                  id="submission-student"
                  className="w-full"
                  aria-invalid={error?.field === "studentId" ? true : undefined}
                  aria-describedby={error?.field === "studentId" ? "submission-student-error" : undefined}
                >
                  <SelectValue placeholder="Choose an enrolled student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                      {student.currentStatus ? (
                        <span className="text-muted-foreground"> · has a paper</span>
                      ) : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                id="submission-student-error"
                message={error?.field === "studentId" ? error.message : undefined}
              />
              {replacing ? (
                <p className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
                  {firstName(selected?.name ?? "")} already has a paper here
                  <StatusBadge status={replacing} />
                  Adding a new one replaces it and clears any suggested score.
                </p>
              ) : null}
            </div>

            <Tabs
              value={mode}
              onValueChange={(value) => {
                setMode(value === "upload" ? "upload" : "paste");
                setError(null);
              }}
              className="min-w-0"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paste">
                  <ClipboardPaste aria-hidden />
                  Paste text
                </TabsTrigger>
                <TabsTrigger value="upload">
                  <FileUp aria-hidden />
                  Upload .txt
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="grid gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="submission-text">Paper text</Label>
                  <span className="tabular text-[0.8125rem] text-muted-foreground">{pluralize(words, "word")}</span>
                </div>
                <Textarea
                  id="submission-text"
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    if (error?.field === "content") setError(null);
                  }}
                  placeholder="Paste the student's paper here."
                  className="max-h-[40dvh] min-h-48 overflow-y-auto"
                  maxLength={MAX_PAPER_CHARS * 2}
                  disabled={pending}
                  aria-invalid={error?.field === "content" ? true : undefined}
                  aria-describedby={error?.field === "content" ? "submission-text-error" : undefined}
                />
                <FieldError id="submission-text-error" message={error?.field === "content" ? error.message : undefined} />
              </TabsContent>

              <TabsContent value="upload" className="grid min-w-0 gap-3">
                <label
                  htmlFor="submission-file"
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    void acceptFile(event.dataTransfer.files?.[0]);
                  }}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-8 text-center transition-colors focus-within:ring-[3px] focus-within:ring-ring hover:bg-muted/50",
                    dragging ? "border-primary/50 bg-primary-soft/50" : "border-border bg-background",
                    error?.field === "file" && "border-destructive/60"
                  )}
                >
                  <FileUp className="mb-1 size-5 text-muted-foreground" aria-hidden />
                  <span className="max-w-full truncate text-sm font-medium text-foreground">
                    {file ? file.name : "Choose a .txt file or drop it here"}
                  </span>
                  <span className="tabular text-[0.8125rem] text-muted-foreground">
                    {file ? `${formatBytes(file.size)} · ${pluralize(words, "word")}` : FILE_HINT}
                  </span>
                  <input
                    ref={fileInputRef}
                    id="submission-file"
                    type="file"
                    accept=".txt,text/plain"
                    className="sr-only"
                    disabled={pending}
                    onChange={(event) => void acceptFile(event.target.files?.[0])}
                    aria-invalid={error?.field === "file" ? true : undefined}
                    aria-describedby={error?.field === "file" ? "submission-file-error" : undefined}
                  />
                </label>
                <FieldError id="submission-file-error" message={error?.field === "file" ? error.message : undefined} />
                {file ? (
                  <div className="grid min-w-0 gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[0.8125rem] font-medium text-foreground">Preview</span>
                      <Button type="button" variant="ghost" size="sm" onClick={clearFile} disabled={pending}>
                        <X aria-hidden />
                        Remove file
                      </Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3 text-[0.8125rem] leading-relaxed break-words whitespace-pre-wrap text-foreground">
                      {preview.length > PREVIEW_CHARS ? `${preview.slice(0, PREVIEW_CHARS)}…` : preview}
                    </div>
                  </div>
                ) : null}
              </TabsContent>
            </Tabs>

            <DialogFooter className="items-center sm:justify-between">
              <p className="flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
                <ShieldCheck className="size-3.5 shrink-0 text-success" aria-hidden />
                Paper text is treated as data, never as instructions.
              </p>
              <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                  {pending ? "Adding…" : "Add submission"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
