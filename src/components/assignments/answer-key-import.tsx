"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, FlaskConical, ImageIcon, Loader2, ScanLine, ScanSearch, Upload, X } from "@/components/icons";

import { FormAlert } from "@/components/classes/form-feedback";
import { extensionFor, ImagePrepError, prepareScanImage } from "@/components/scan/image-prep";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { pluralize } from "@/lib/format";
import {
  describeImport,
  parseAnswerKeyResponse,
  type AnswerKeyEngine,
  type AnswerKeyResponse,
  type AnswerKeySuccess,
} from "@/lib/scan/answer-key";
import { MAX_SCAN_IMAGE_BYTES, PHOTO_TOO_LARGE_MESSAGE } from "@/lib/scan/images";
import { SAMPLE_ANSWER_KEY_PHOTOS } from "@/lib/scan/samples";
import { cn } from "@/lib/utils";

type Phase =
  | { kind: "idle" }
  | { kind: "preparing" }
  | { kind: "uploading"; percent: number }
  | { kind: "reading" }
  | { kind: "confirm"; result: AnswerKeySuccess }
  | { kind: "done"; result: AnswerKeySuccess }
  | { kind: "error"; message: string };

const ENGINE_LABEL: Record<AnswerKeyEngine, string> = {
  openai: "Read by GPT-4o",
  claude: "Read by Claude",
  demo: "Demo: sample answer key",
};

/** The live reader's name in the copy. */
const READER_NAME: Record<Exclude<AnswerKeyEngine, "demo">, string> = { openai: "GPT-4o", claude: "Claude" };

const NETWORK_ERROR = "Network error. Check your connection, then try again.";

function totalPoints(result: AnswerKeySuccess): number {
  return result.questions.reduce((sum, question) => sum + question.maxPoints, 0);
}

/**
 * Fit the photo to one upload request (under Vercel's 4.5 MB body limit): it
 * is the only photo, so it may use the whole MAX_SCAN_IMAGE_BYTES. A JPEG,
 * PNG, or WebP within both limits is sent byte-for-byte; anything larger, or
 * in another format the browser can open (HEIC), is resized as a JPEG. The
 * bundled sample is never re-encoded, so the demo reader recognizes its bytes.
 */
async function preparePhoto(file: File): Promise<{ blob: Blob; name: string } | { error: string }> {
  if (file.type && !file.type.startsWith("image/")) return { error: "Choose a photo: JPEG, PNG, or WebP." };
  try {
    const prepared = await prepareScanImage(file, MAX_SCAN_IMAGE_BYTES);
    const name = prepared.resized || !file.name ? `answer-key.${extensionFor(prepared.type)}` : file.name;
    return { blob: prepared.blob, name };
  } catch (caught) {
    return { error: caught instanceof ImagePrepError ? caught.message : "That photo couldn't be opened. Try another photo." };
  }
}

/** True when the response body carries the route's own error message. */
function hasErrorMessage(body: unknown): boolean {
  return Boolean(body && typeof body === "object" && "error" in body && typeof body.error === "string" && body.error.trim());
}

/** POST the photo with real upload progress (fetch has no upload progress events). */
function postAnswerKey(
  blob: Blob,
  name: string,
  handlers: { onProgress: (percent: number) => void; onUploaded: () => void },
  xhrRef: React.RefObject<XMLHttpRequest | null>
): Promise<AnswerKeyResponse | null> {
  return new Promise((resolve) => {
    const body = new FormData();
    body.append("image", blob, name);
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", "/api/answer-key");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) handlers.onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.upload.onload = () => handlers.onUploaded();
    xhr.onload = () => {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(xhr.responseText);
      } catch {
        parsed = null;
      }
      // A 413 without the route's JSON came from the host (Vercel's body
      // limit) before the route ran: name the limit the app actually uses.
      if (xhr.status === 413 && !hasErrorMessage(parsed)) {
        resolve({ ok: false, error: PHOTO_TOO_LARGE_MESSAGE });
        return;
      }
      resolve(parseAnswerKeyResponse(parsed, xhr.status));
    };
    xhr.onerror = () => resolve({ ok: false, error: NETWORK_ERROR });
    xhr.ontimeout = () => resolve({ ok: false, error: "Reading the answer key took too long. Try again." });
    // Canceled by the teacher: no message.
    xhr.onabort = () => resolve(null);
    xhr.timeout = 150_000;
    xhr.send(body);
  });
}

/**
 * "Import the answer key from a photo" for a handwritten test. The photo is
 * read on the server (GPT-4o or Claude, or the demo reader without a key); the
 * questions it returns replace the builder's questions, after a confirmation
 * when the teacher has already written some. Nothing is saved until the
 * teacher creates the assignment.
 */
export function AnswerKeyImport({
  engine,
  existingCount,
  disabled,
  onApply,
}: {
  /** Which reader the server will use, so the copy can say so up front. */
  engine: AnswerKeyEngine;
  /** Questions the teacher has already written (0 means nothing to replace). */
  existingCount: number;
  disabled?: boolean;
  onApply: (result: AnswerKeySuccess) => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const runRef = useRef(0);

  // The read finishes after an await: use the builder's latest state, not the state when it started.
  const onApplyRef = useRef(onApply);
  const existingCountRef = useRef(existingCount);
  useEffect(() => {
    onApplyRef.current = onApply;
    existingCountRef.current = existingCount;
  });

  const busy = phase.kind === "preparing" || phase.kind === "uploading" || phase.kind === "reading";
  const sample = SAMPLE_ANSWER_KEY_PHOTOS[0];

  // Release the preview URL when it changes or the builder unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Stop an in-flight request if the builder unmounts.
  useEffect(() => () => xhrRef.current?.abort(), []);

  async function read(source: Blob, name: string, alreadyPrepared: boolean) {
    const run = ++runRef.current;
    setPreview(URL.createObjectURL(source));
    setPhase({ kind: "preparing" });

    let blob = source;
    let fileName = name;
    if (!alreadyPrepared) {
      const prepared = await preparePhoto(source instanceof File ? source : new File([source], name, { type: source.type }));
      if (run !== runRef.current) return;
      if ("error" in prepared) {
        setPhase({ kind: "error", message: prepared.error });
        return;
      }
      blob = prepared.blob;
      fileName = prepared.name;
    }

    setPhase({ kind: "uploading", percent: 0 });
    const response = await postAnswerKey(
      blob,
      fileName,
      {
        onProgress: (percent) => {
          if (run === runRef.current) setPhase((current) => (current.kind === "uploading" ? { kind: "uploading", percent } : current));
        },
        onUploaded: () => {
          if (run === runRef.current) setPhase({ kind: "reading" });
        },
      },
      xhrRef
    );
    xhrRef.current = null;
    if (run !== runRef.current) return;
    if (response === null) {
      setPhase({ kind: "idle" });
      return;
    }
    if (!response.ok) {
      setPhase({ kind: "error", message: response.error });
      return;
    }
    if (existingCountRef.current > 0) {
      setPhase({ kind: "confirm", result: response });
      return;
    }
    onApplyRef.current(response);
    setPhase({ kind: "done", result: response });
  }

  function onFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Allow choosing the same file again after an error.
    event.target.value = "";
    if (file) void read(file, file.name, false);
  }

  async function readSample() {
    const run = ++runRef.current;
    setPhase({ kind: "preparing" });
    try {
      const response = await fetch(sample.src, { cache: "force-cache" });
      if (!response.ok) throw new Error("sample unavailable");
      const blob = await response.blob();
      if (run !== runRef.current) return;
      // Sent byte-for-byte, so the demo reader recognizes it.
      void read(blob, sample.src.split("/").pop() ?? "sample-answer-key.jpg", true);
    } catch {
      if (run === runRef.current) setPhase({ kind: "error", message: "The sample answer key couldn't be loaded. Try again." });
    }
  }

  function cancel() {
    runRef.current++;
    xhrRef.current?.abort();
    xhrRef.current = null;
    setPhase({ kind: "idle" });
  }

  const readingLabel =
    engine === "demo"
      ? "Checking the photo against the sample answer key…"
      : `Reading questions, answers, and points with ${READER_NAME[engine]}…`;

  return (
    <section
      aria-labelledby="answer-key-import-title"
      className="rounded-xl border border-dashed border-input/50 bg-card p-4 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
          <ScanLine className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 space-y-0.5">
          <h3 id="answer-key-import-title" className="text-[0.9375rem] font-medium text-foreground">
            Import the answer key from a photo
          </h3>
          <p className="text-[0.8125rem] text-pretty text-muted-foreground">
            {engine === "demo"
              ? "Demo mode reads the sample answer key only. Set ANTHROPIC_API_KEY to read your own photos with Claude."
              : `${READER_NAME[engine]} reads each question, its answer, and its points from any photo, including the sample. Check every question before you save.`}
          </p>
        </div>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {busy || phase.kind === "done" ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-background p-3">
            {preview ? (
              <img src={preview} alt="" className="h-14 w-11 shrink-0 rounded-md border border-border object-cover" />
            ) : null}
            <div className="min-w-0 flex-1 space-y-2">
              {phase.kind === "done" ? (
                <>
                  <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                    Imported {pluralize(phase.result.questions.length, "question")}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <EngineBadge engine={phase.result.engine} />
                    <span className="tabular text-[0.8125rem] text-muted-foreground">{describeImport(phase.result)}</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="flex items-center gap-1.5 text-sm text-foreground">
                    <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                    {phase.kind === "uploading"
                      ? `Uploading photo… ${phase.percent}%`
                      : phase.kind === "reading"
                        ? readingLabel
                        : "Preparing the photo…"}
                  </p>
                  <Progress
                    value={phase.kind === "uploading" ? phase.percent : 100}
                    className={cn("h-1.5", phase.kind !== "uploading" && "animate-pulse")}
                    aria-label="Answer key import progress"
                    aria-valuetext={phase.kind === "uploading" ? `${phase.percent}% uploaded` : "Reading the photo"}
                  />
                </>
              )}
            </div>
            {busy ? (
              <Button type="button" variant="ghost" size="icon-sm" onClick={cancel} aria-label="Cancel the import">
                <X />
              </Button>
            ) : null}
          </div>
        ) : null}

        {phase.kind === "error" ? <FormAlert className="mt-4">{phase.message}</FormAlert> : null}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          type="button"
          variant="tonal"
          onClick={() => uploadRef.current?.click()}
          disabled={disabled || busy}
        >
          <Upload aria-hidden />
          Upload photo
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => cameraRef.current?.click()}
          disabled={disabled || busy}
          className="md:hidden"
        >
          <Camera aria-hidden />
          Take photo
        </Button>
        {/* With a key, the sample is a real AI read like any photo, so it is not labelled demo. */}
        <Button type="button" variant="text" onClick={() => void readSample()} disabled={disabled || busy}>
          {engine === "demo" ? <FlaskConical aria-hidden /> : <ImageIcon aria-hidden />}
          {engine === "demo" ? "Use the sample answer key (demo)" : "Try the sample answer key"}
        </Button>
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          onChange={onFileChosen}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileChosen}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
      </div>

      <AlertDialog
        open={phase.kind === "confirm"}
        onOpenChange={(open) => {
          // Functional update: "Replace questions" has already moved on to "done".
          if (!open) setPhase((current) => (current.kind === "confirm" ? { kind: "idle" } : current));
        }}
      >
        {phase.kind === "confirm" ? (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Replace your {pluralize(existingCount, "question")}?</AlertDialogTitle>
              <AlertDialogDescription className="tabular">
                The photo has {pluralize(phase.result.questions.length, "question")} worth{" "}
                {pluralize(totalPoints(phase.result), "point")}. Your current questions will be replaced, and you
                can undo right after.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div>
              <EngineBadge engine={phase.result.engine} />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep my questions</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onApply(phase.result);
                  setPhase({ kind: "done", result: phase.result });
                }}
              >
                Replace questions
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </section>
  );
}

/** Says which engine read the answer key, so demo output is never mistaken for AI. */
function EngineBadge({ engine }: { engine: AnswerKeyEngine }) {
  return engine !== "demo" ? (
    <Badge variant="default">
      <ScanSearch aria-hidden />
      {ENGINE_LABEL[engine]}
    </Badge>
  ) : (
    <Badge variant="outline" className="border-dashed">
      <FlaskConical aria-hidden />
      {ENGINE_LABEL.demo}
    </Badge>
  );
}
