"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import {
  CircleAlert,
  ClipboardPaste,
  FileText,
  FileUp,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  X,
} from "@/components/icons";
import { toast } from "sonner";

import { submitPaper } from "@/app/(student)/student/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { pluralize, wordCount } from "@/lib/format";
import {
  formatBytes,
  MAX_PAPER_CHARS,
  MAX_PAPER_FILE_BYTES,
  normalizePaperText,
  txtFileProblem,
  validatePaperText,
} from "@/lib/paper";
import { cn } from "@/lib/utils";

type Work = { kind: "text"; text: string } | { kind: "file"; file: File; text: string };

function previewOf(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 160);
}

/**
 * Classroom's "Your work" controls: "+ Add or create" (paste text or upload
 * a .txt file), the attached paper as a tile, then "Turn in". The paper is
 * checked here with the same rules the server applies, and the server
 * re-checks everything (enrollment, send-back state, limits) on submit.
 *
 * Nothing the student typed is thrown away by closing the paste dialog: the
 * draft lives here until it is added, and only "Discard changes" (editing a
 * saved paper) reverts it. After "Remove" on a sent-back paper, "Paste text"
 * (or "Restore your previous paper") brings the previous paper back.
 */
export function TurnInForm({
  assignmentId,
  defaultText = "",
  resubmit = false,
}: {
  assignmentId: string;
  /** The previous paper, prefilled when resubmitting after a send-back. */
  defaultText?: string;
  resubmit?: boolean;
}) {
  const router = useRouter();
  const [work, setWork] = useState<Work | null>(() => (defaultText ? { kind: "text", text: defaultText } : null));
  const [pasteOpen, setPasteOpen] = useState(false);
  // Starts from the previous paper (when resubmitting) and survives every way of
  // closing the dialog, so Escape, a stray backdrop tap, or Remove never loses it.
  const [draft, setDraft] = useState(defaultText);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const turnInRef = useRef<HTMLButtonElement>(null);
  /** Set when "Paste text" is chosen; the dialog opens once the menu has closed. */
  const openingDialog = useRef(false);
  /**
   * Where focus goes once the attached paper changes. Remove and a new upload
   * unmount the control that had focus, so focus moves to the next step.
   */
  const focusAfterChange = useRef<"add" | "turnIn" | null>(null);

  const textareaId = useId();
  const textHelpId = useId();
  const draftErrorId = useId();
  const errorId = useId();
  const fileHelpId = useId();

  const draftText = normalizePaperText(draft);
  const draftWords = wordCount(draftText);
  const nearLimit = draftText.length > MAX_PAPER_CHARS * 0.9;
  const overLimit = draftText.length > MAX_PAPER_CHARS;

  const workText = work ? normalizePaperText(work.text) : "";
  const editing = work?.kind === "text";
  /** Editing a saved paper, with changes that haven't been saved yet. */
  const unsavedEdits = editing && draft !== work.text;

  useEffect(() => {
    const target = focusAfterChange.current;
    if (!target) return;
    focusAfterChange.current = null;
    // Only move focus if it was lost (the focused control unmounted) or is
    // still in this form, e.g. not after a file dropped while typing elsewhere.
    const active = document.activeElement;
    if (active && active !== document.body && !formRef.current?.contains(active)) return;
    (target === "add" ? addRef : turnInRef).current?.focus();
  }, [work]);

  function openPaste() {
    // The draft is kept as it is: a new paste picks up where the student left
    // off, and editing a saved paper keeps any changes not saved yet.
    setDraftError(null);
    setPasteOpen(true);
  }

  function removeWork() {
    if (!work) return;
    focusAfterChange.current = "add";
    setAnnouncement(work.kind === "file" ? `${work.file.name} removed.` : "Paper removed.");
    setWork(null);
    setError(null);
  }

  function restorePrevious() {
    focusAfterChange.current = "turnIn";
    // The draft is left alone: if it differs, "Edit your paper" offers it as unsaved changes.
    setWork({ kind: "text", text: defaultText });
    setError(null);
    setAnnouncement("Your previous paper is back.");
  }

  function savePaste(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Stop the submit from reaching the page (the dialog renders in a portal).
    event.stopPropagation();
    const problem = validatePaperText(draftText);
    if (problem) {
      setDraftError(problem);
      return;
    }
    setWork({ kind: "text", text: draft });
    setError(null);
    setAnnouncement(editing ? "Paper updated." : "Paper added.");
    setPasteOpen(false);
  }

  async function chooseFile(file: File | null | undefined) {
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    const problem = txtFileProblem(file);
    if (problem) {
      setError(problem);
      return;
    }
    let contents: string;
    try {
      contents = await file.text();
    } catch {
      setError("That file could not be read. Try saving it again as .txt.");
      return;
    }
    const textProblem = validatePaperText(normalizePaperText(contents));
    if (textProblem) {
      setError(textProblem);
      return;
    }
    focusAfterChange.current = "turnIn";
    setAnnouncement(`${file.name} attached.`);
    setWork({ kind: "file", file, text: contents });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!work) {
      setError("Add your paper first: paste the text or upload a .txt file.");
      return;
    }

    const formData = new FormData();
    if (work.kind === "text") {
      const problem = validatePaperText(workText);
      if (problem) {
        setError(problem);
        return;
      }
      formData.set("mode", "paste");
      formData.set("content", work.text);
    } else {
      formData.set("mode", "upload");
      formData.set("file", work.file);
    }

    startTransition(async () => {
      let result: Awaited<ReturnType<typeof submitPaper>>;
      try {
        result = await submitPaper(assignmentId, formData);
      } catch (error) {
        // Next's own signals (a redirect) go back to Next; anything else means the server was out of reach.
        unstable_rethrow(error);
        setError("Couldn't reach the server. Check your connection and try again.");
        return;
      }
      if (!result.ok) {
        if (result.stale) {
          // Another tab, or the teacher, changed this paper: show the real
          // state. The toast keeps the reason once the form is replaced.
          toast.error(resubmit ? "Couldn't resubmit" : "Couldn't turn in", { description: result.error });
          router.refresh();
        } else {
          setError(result.error);
        }
        return;
      }
      toast.success(resubmit ? "Resubmitted. Your teacher will review it." : "Turned in. Your teacher will review it.");
      if (result.xpAwarded > 0) {
        toast(`+${result.xpAwarded} XP`, {
          description: `${result.onTime ? "Includes the on-time bonus. " : ""}XP tracks effort. It never changes your grade.`,
        });
      }
      router.refresh();
    });
  }

  return (
    <>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        aria-describedby={error ? errorId : undefined}
        onDragOver={(event) => {
          if (pending || work) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          if (pending || work) return;
          event.preventDefault();
          setDragging(false);
          void chooseFile(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "space-y-3 rounded-lg transition-colors",
          dragging && "bg-primary-soft/50 ring-2 ring-primary/40"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          className="sr-only"
          tabIndex={-1}
          disabled={pending}
          aria-label="Upload your paper as a .txt file"
          aria-describedby={fileHelpId}
          onChange={(event) => void chooseFile(event.target.files?.[0])}
        />

        {work ? (
          <div className="flex items-stretch overflow-hidden rounded-lg border border-border bg-card">
            <span className="flex w-12 shrink-0 items-center justify-center border-r border-border bg-secondary text-primary">
              <FileText className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 px-3 py-2.5">
              <p className="truncate text-sm font-medium text-foreground">
                {work.kind === "file" ? work.file.name : resubmit ? "Your paper" : "Pasted text"}
              </p>
              <p className="tabular text-xs text-muted-foreground">
                {pluralize(wordCount(workText), "word")}
                {work.kind === "file" ? ` · ${formatBytes(work.file.size)}` : ""}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 break-words text-muted-foreground">
                {previewOf(workText)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 pr-1">
              {work.kind === "text" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={openPaste}
                  disabled={pending}
                  aria-label="Edit your paper"
                >
                  <Pencil className="size-4" />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={removeWork}
                disabled={pending}
                aria-label={work.kind === "file" ? `Remove ${work.file.name}` : "Remove your paper"}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button ref={addRef} type="button" variant="outline" className="w-full" disabled={pending}>
                <Plus aria-hidden />
                Add or create
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56"
              onCloseAutoFocus={(event) => {
                // Open the paste dialog only once the menu has closed, so the
                // dialog (not the closing menu) owns focus.
                if (openingDialog.current) {
                  openingDialog.current = false;
                  event.preventDefault();
                  openPaste();
                }
              }}
            >
              <DropdownMenuItem
                onSelect={() => {
                  openingDialog.current = true;
                }}
                className="min-h-10"
              >
                <ClipboardPaste aria-hidden />
                Paste text
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => fileInputRef.current?.click()} className="min-h-10">
                <FileUp aria-hidden />
                Upload .txt file
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!work && resubmit && defaultText ? (
          <Button type="button" variant="text" size="sm" onClick={restorePrevious} disabled={pending} className="-mt-1">
            <RotateCcw aria-hidden />
            Restore your previous paper
          </Button>
        ) : null}

        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>

        {error ? (
          <div
            id={errorId}
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-[0.875rem] text-danger-soft-foreground"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="min-w-0">{error}</span>
          </div>
        ) : null}

        <Button ref={turnInRef} type="submit" disabled={pending || !work} className="w-full">
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
          {pending ? (resubmit ? "Resubmitting…" : "Turning in…") : resubmit ? "Resubmit" : "Turn in"}
        </Button>

        <p id={fileHelpId} className="text-[0.8125rem] leading-5 text-pretty text-muted-foreground">
          {work
            ? resubmit
              ? "Edit your paper if you need to, then resubmit it."
              : "Check your paper, then turn it in. You can turn it in once."
            : `Paste your paper or upload a plain-text .txt file (up to ${formatBytes(MAX_PAPER_FILE_BYTES)}). You can also drop a file here.`}
        </p>
        <p className="flex items-start gap-1.5 text-[0.8125rem] leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          Your teacher reviews every grade before it&apos;s returned.
        </p>
      </form>

      <Dialog open={pasteOpen} onOpenChange={(open) => !pending && setPasteOpen(open)}>
        <DialogContent
          className="sm:max-w-2xl"
          onCloseAutoFocus={(event) => {
            // Back to the next step: "Turn in" once there's a paper, else "Add or create".
            event.preventDefault();
            const target = turnInRef.current && !turnInRef.current.disabled ? turnInRef.current : addRef.current;
            target?.focus();
          }}
        >
          <form onSubmit={savePaste} noValidate className="grid gap-4">
            <DialogHeader>
              <DialogTitle className="font-display text-[1.375rem] font-normal">
                {editing ? "Edit your paper" : "Paste your paper"}
              </DialogTitle>
              <DialogDescription>Plain text only. Formatting like bold or headings is not kept.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor={textareaId} className="sr-only">
                Your paper
              </Label>
              <Textarea
                id={textareaId}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (draftError) setDraftError(null);
                }}
                rows={14}
                autoFocus
                placeholder="Paste the full text of your paper here."
                aria-describedby={draftError ? `${textHelpId} ${draftErrorId}` : textHelpId}
                aria-invalid={overLimit || draftError !== null ? true : undefined}
                className="max-h-[55dvh] min-h-64 px-4 py-3 text-[0.9375rem] leading-7"
              />
              <p id={textHelpId} className="tabular flex justify-end text-xs text-muted-foreground">
                <span className={cn(overLimit && "font-medium text-danger-soft-foreground")}>
                  {pluralize(draftWords, "word")}
                  {nearLimit
                    ? ` · ${draftText.length.toLocaleString("en-US")} / ${MAX_PAPER_CHARS.toLocaleString("en-US")} characters`
                    : ""}
                </span>
              </p>
              {draftError ? (
                <p
                  id={draftErrorId}
                  role="alert"
                  className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger-soft-foreground"
                >
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {draftError}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              {unsavedEdits ? (
                <Button
                  type="button"
                  variant="text"
                  onClick={() => {
                    // The one explicit way to drop edits: the saved paper is still attached.
                    setDraft(work.text);
                    setDraftError(null);
                    setPasteOpen(false);
                  }}
                >
                  Discard changes
                </Button>
              ) : (
                <Button type="button" variant="text" onClick={() => setPasteOpen(false)}>
                  Cancel
                </Button>
              )}
              <Button type="submit">{editing ? "Save" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
