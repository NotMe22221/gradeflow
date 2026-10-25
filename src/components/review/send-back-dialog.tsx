"use client";

import { useEffect, useId, useState } from "react";
import { CornerUpLeft, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { firstName } from "@/lib/format";
import { MAX_RETURN_NOTE_CHARS } from "@/lib/review/model";

export function SendBackDialog({
  open,
  onOpenChange,
  studentName,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  pending: boolean;
  /** Resolves true when the paper was sent back. */
  onConfirm: (note: string) => Promise<boolean>;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const noteId = useId();
  const errorId = useId();
  const first = firstName(studentName);
  const [modifierKey, setModifierKey] = useState("Ctrl");

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setModifierKey("⌘");
  }, []);

  async function submit() {
    if (pending) return;
    const trimmed = note.trim();
    if (!trimmed) {
      setError(`Add a note so ${first} knows what to revise.`);
      return;
    }
    if (trimmed.length > MAX_RETURN_NOTE_CHARS) {
      setError(`Keep the note under ${MAX_RETURN_NOTE_CHARS.toLocaleString()} characters.`);
      return;
    }
    setError(null);
    const sent = await onConfirm(trimmed);
    if (sent) setNote("");
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (pending ? undefined : onOpenChange(next))}>
      <DialogContent showCloseButton={!pending}>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Send back to {first}</DialogTitle>
            <DialogDescription>
              {first} sees your note on the assignment page and can resubmit. Nothing is published.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor={noteId}>What should {first} revise?</Label>
            <Textarea
              id={noteId}
              autoFocus
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void submit();
                }
              }}
              maxLength={MAX_RETURN_NOTE_CHARS}
              rows={5}
              placeholder="For example: Your thesis is clear, but the second paragraph needs a source for each claim."
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              disabled={pending}
              className="min-h-28 leading-relaxed"
            />
            {error ? (
              <p id={errorId} className="text-[13px] text-danger-soft-foreground">
                {error}
              </p>
            ) : (
              <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                <Kbd>{modifierKey}</Kbd>
                <span aria-hidden>+</span>
                <Kbd>Enter</Kbd>
                <span>to send</span>
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <LoaderCircle className="animate-spin" aria-hidden />
                  Sending…
                </>
              ) : (
                <>
                  <CornerUpLeft aria-hidden />
                  Send back to student
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
