"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CircleAlert,
  ClipboardPaste,
  FileText,
  FileUp,
  LoaderCircle,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { submitPaper } from "@/app/(student)/student/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { pluralize, wordCount } from "@/lib/format";
import { cn } from "@/lib/utils";

type Mode = "paste" | "upload";

type SelectedFile = {
  file: File;
  text: string;
};

const PREVIEW_LINES = 8;

/** Same cleanup the server applies, so counts here match what gets stored. */
function normalizeForCount(text: string): string {
  return text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").trim();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
}

function previewOf(text: string): string {
  return text
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .slice(0, PREVIEW_LINES)
    .join("\n");
}

export function SubmitPaperForm({
  assignmentId,
  defaultText = "",
  resubmit = false,
  maxChars,
  minChars,
}: {
  assignmentId: string;
  /** Prefilled paste text, used when resubmitting after a send-back. */
  defaultText?: string;
  resubmit?: boolean;
  maxChars: number;
  minChars: number;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("paste");
  const [text, setText] = useState(defaultText);
  const [selected, setSelected] = useState<SelectedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const textareaId = useId();
  const textHelpId = useId();
  const fileInputId = useId();
  const fileHelpId = useId();
  const errorId = useId();

  const pasted = normalizeForCount(text);
  const pastedWords = wordCount(pasted);
  const nearLimit = pasted.length > maxChars * 0.9;
  const overLimit = pasted.length > maxChars;

  const uploaded = selected ? normalizeForCount(selected.text) : "";
  const uploadedWords = wordCount(uploaded);

  const canSubmit = mode === "paste" ? pasted.length > 0 : selected !== null && !fileError;

  function rejectFile(message: string) {
    setSelected(null);
    setFileError(message);
    // Clear the input so choosing the same file again still fires a change.
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function chooseFile(file: File | null | undefined) {
    setError(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt") || (file.type && file.type !== "text/plain")) {
      rejectFile("Choose a plain-text .txt file. Save Word or Google Docs files as .txt first.");
      return;
    }
    if (file.size > maxChars * 4) {
      rejectFile("That file is too large for one paper.");
      return;
    }
    let contents: string;
    try {
      contents = await file.text();
    } catch {
      rejectFile("That file could not be read. Try saving it again as .txt.");
      return;
    }
    const cleaned = normalizeForCount(contents);
    setSelected({ file, text: contents });
    if (cleaned.length < minChars) {
      setFileError("That file looks empty. Check that it contains your paper.");
    } else if (cleaned.length > maxChars) {
      setFileError(`Papers are limited to ${maxChars.toLocaleString()} characters.`);
    } else {
      setFileError(null);
    }
  }

  function clearFile() {
    setSelected(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("mode", mode);
    if (mode === "paste") {
      if (pasted.length < minChars) {
        setError("That paper looks empty. Paste the full text or upload a .txt file.");
        return;
      }
      if (overLimit) {
        setError(`Papers are limited to ${maxChars.toLocaleString()} characters.`);
        return;
      }
      formData.set("content", text);
    } else {
      if (!selected) {
        setError("Choose a .txt file to upload.");
        return;
      }
      if (fileError) {
        setError(fileError);
        return;
      }
      formData.set("file", selected.file);
    }

    startTransition(async () => {
      const result = await submitPaper(assignmentId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        resubmit
          ? "Paper resubmitted. Your teacher will review it."
          : "Paper submitted. Your teacher will review it."
      );
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      aria-describedby={error ? errorId : undefined}
      noValidate
    >
      <Tabs
        value={mode}
        onValueChange={(value) => {
          setMode(value as Mode);
          setError(null);
        }}
      >
        <TabsList className="w-full sm:w-fit" aria-label="How do you want to submit?">
          <TabsTrigger value="paste" disabled={pending} className="sm:px-4">
            <ClipboardPaste aria-hidden />
            Paste text
          </TabsTrigger>
          <TabsTrigger value="upload" disabled={pending} className="sm:px-4">
            <FileUp aria-hidden />
            Upload .txt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paste" className="space-y-2">
          <Label htmlFor={textareaId}>Your paper</Label>
          <Textarea
            id={textareaId}
            name="content"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              if (error) setError(null);
            }}
            disabled={pending}
            rows={14}
            placeholder="Paste the full text of your paper here."
            aria-describedby={textHelpId}
            aria-invalid={overLimit || (error !== null && mode === "paste") ? true : undefined}
            className="max-h-[32rem] min-h-64 px-4 py-3 text-[15px] leading-7"
          />
          <div
            id={textHelpId}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground"
          >
            <span>Plain text only. Formatting like bold or headings is not kept.</span>
            <span
              className={cn("tabular", overLimit && "font-medium text-danger-soft-foreground")}
            >
              {pluralize(pastedWords, "word")}
              {nearLimit
                ? ` · ${pasted.length.toLocaleString()} / ${maxChars.toLocaleString()} characters`
                : ""}
            </span>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-3">
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            name="file"
            accept=".txt,text/plain"
            className="peer sr-only"
            disabled={pending}
            tabIndex={selected ? -1 : undefined}
            aria-label="Upload your paper as a .txt file"
            aria-describedby={fileHelpId}
            onChange={(event) => void chooseFile(event.target.files?.[0])}
          />
          {selected ? (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground ring-1 ring-border">
                  <FileText className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{selected.file.name}</p>
                  <p className="tabular text-xs text-muted-foreground">
                    {formatBytes(selected.file.size)} · {pluralize(uploadedWords, "word")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pending}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={clearFile}
                  disabled={pending}
                  aria-label={`Remove ${selected.file.name}`}
                >
                  <X />
                </Button>
              </div>
              {uploaded ? (
                <div className="border-t border-border bg-muted/40 px-4 py-3">
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Preview</p>
                  <p className="line-clamp-8 text-[13px] leading-6 break-words whitespace-pre-wrap text-foreground/80">
                    {previewOf(uploaded)}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <label
              htmlFor={fileInputId}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (!pending) void chooseFile(event.dataTransfer.files?.[0]);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-input bg-muted/40 px-6 py-12 text-center transition-colors hover:bg-muted/70 [&>*]:pointer-events-none",
                "peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring",
                dragging && "border-primary/60 bg-primary-soft/60"
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-card text-muted-foreground shadow-card ring-1 ring-border">
                <FileUp className="size-5" aria-hidden />
              </span>
              <span className="space-y-1">
                <span className="block text-sm font-medium text-foreground">Choose a .txt file</span>
                <span className="block text-[13px] text-muted-foreground">or drag it here</span>
              </span>
            </label>
          )}
          <p
            id={fileHelpId}
            className={cn("text-xs", fileError ? "text-danger-soft-foreground" : "text-muted-foreground")}
          >
            {fileError ??
              "Plain-text .txt files only. In Word or Google Docs, use File, then Download or Save as, then Plain text."}
          </p>
        </TabsContent>
      </Tabs>

      {error ? (
        <div
          id={errorId}
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger-soft-foreground"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="min-w-0">{error}</span>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-[13px] text-muted-foreground sm:items-center">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success sm:mt-0" aria-hidden />
          Your teacher reviews every grade before it&apos;s published.
        </p>
        <Button type="submit" disabled={pending || !canSubmit} className="w-full sm:w-auto">
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          {pending ? "Submitting…" : resubmit ? "Resubmit paper" : "Submit paper"}
        </Button>
      </div>
    </form>
  );
}
