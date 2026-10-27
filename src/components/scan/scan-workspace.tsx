"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CircleCheck,
  FlaskConical,
  ImagePlus,
  KeyRound,
  LoaderCircle,
  ScanLine,
  ShieldCheck,
  Upload,
  X,
} from "@/components/icons";
import { toast } from "sonner";

import { FieldError, FormAlert } from "@/components/classes/form-feedback";
import { ClassAvatar } from "@/components/classroom/class-avatar";
import { CameraCapture } from "@/components/scan/camera-capture";
import {
  extensionFor,
  ImagePrepError,
  matchSamplePhoto,
  prepareScanImage,
  type PreparedImage,
} from "@/components/scan/image-prep";
import { PageList } from "@/components/scan/page-list";
import { SampleMenu } from "@/components/scan/sample-menu";
import { AssignmentPicker, assignmentHint, StudentPicker } from "@/components/scan/scan-pickers";
import { ScanProgress } from "@/components/scan/scan-progress";
import { ScanResult } from "@/components/scan/scan-result";
import {
  paperKey,
  type ScanAssignmentOption,
  type ScanClassOption,
  type ScanPage,
  type ScanPaperState,
} from "@/components/scan/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { firstName, pluralize } from "@/lib/format";
import { scrollBehavior } from "@/lib/motion";
import { MAX_PAPER_CHARS } from "@/lib/paper";
import {
  MAX_SCAN_PAGES,
  SCAN_IMAGE_TYPES,
  SCAN_PHOTOS_TOO_LARGE_MESSAGE,
  scanPhotosProblem,
} from "@/lib/scan/images";
import type { SampleTestPhoto } from "@/lib/scan/samples";
import type { ScanErrorCode, ScanGradeResponse, ScanGradeSuccess } from "@/lib/scan/types";
import { cn } from "@/lib/utils";

type Field = "pages" | "answerKey" | "assignment" | "student" | "transcription";
type FormErrorState = { message: string; field?: Field; code?: ScanErrorCode };
type Phase = "idle" | "grading" | "done";
type PendingImage = { blob: Blob; name: string; sample?: SampleTestPhoto };

const ACCEPT = SCAN_IMAGE_TYPES.join(",");

function fieldMessage(error: FormErrorState | null, field: Field): string | undefined {
  return error?.field === field ? error.message : undefined;
}

function describeDimensions(page: ScanPage): string {
  const size = page.width > 0 ? `${page.width}×${page.height}` : "Photo";
  return page.resized ? `${size} · resized for upload` : size;
}

export function ScanWorkspace({
  classes,
  assignments,
  papers,
  visionEnabled,
  initialAssignmentId,
  initialStudentId,
}: {
  classes: ScanClassOption[];
  assignments: ScanAssignmentOption[];
  papers: Record<string, ScanPaperState>;
  visionEnabled: boolean;
  initialAssignmentId: string;
  initialStudentId: string;
}) {
  const router = useRouter();
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [answerKey, setAnswerKey] = useState<ScanPage | null>(null);
  const [assignmentId, setAssignmentId] = useState(initialAssignmentId);
  const [studentId, setStudentId] = useState(initialStudentId);
  const [transcription, setTranscription] = useState("");
  const [needsTranscription, setNeedsTranscription] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<FormErrorState | null>(null);
  const [result, setResult] = useState<ScanGradeSuccess | null>(null);
  const [matchNotice, setMatchNotice] = useState<string | null>(null);

  const nextId = useRef(0);
  const objectUrls = useRef(new Set<string>());
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const answerKeyInputRef = useRef<HTMLInputElement>(null);
  const transcriptionRef = useRef<HTMLTextAreaElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Release every thumbnail URL and cancel an in-flight request on unmount.
  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (phase === "done") resultRef.current?.focus();
    if (phase !== "idle") sideRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });
  }, [phase]);

  useEffect(() => {
    if (error?.code === "NEEDS_TRANSCRIPTION") transcriptionRef.current?.focus();
  }, [error]);

  const assignment = assignments.find((option) => option.id === assignmentId) ?? null;
  const klass = assignment ? (classes.find((option) => option.id === assignment.classId) ?? null) : null;
  const students = klass?.students ?? [];
  const student = students.find((option) => option.id === studentId) ?? null;
  const paper = assignment && student ? papers[paperKey(assignment.id, student.id)] : undefined;

  const busy = phase !== "idle";
  const full = pages.length >= MAX_SCAN_PAGES;
  const firstPageIsSample = Boolean(pages[0]?.sampleId);
  const showTranscription = !visionEnabled && pages.length > 0 && (!firstPageIsSample || needsTranscription);

  function makePage(prepared: PreparedImage, name: string, sampleId: string | null): ScanPage {
    const url = URL.createObjectURL(prepared.blob);
    objectUrls.current.add(url);
    nextId.current += 1;
    return {
      id: `page-${nextId.current}`,
      blob: prepared.blob,
      url,
      name,
      sampleId,
      width: prepared.width,
      height: prepared.height,
      resized: prepared.resized,
    };
  }

  function releasePage(page: ScanPage) {
    URL.revokeObjectURL(page.url);
    objectUrls.current.delete(page.url);
  }

  function clearFieldError(...fields: Field[]) {
    setError((current) => (current?.field && fields.includes(current.field) ? null : current));
  }

  /** Select the seeded assignment and student a sample photo belongs to, when they exist. */
  function applySample(sample: SampleTestPhoto) {
    // The picker lists handwritten tests only.
    const match = assignments.find((option) => option.title === sample.assignmentTitle);
    if (!match) return;
    const matchStudent = classes
      .find((option) => option.id === match.classId)
      ?.students.find((option) => option.name === sample.studentName);
    setAssignmentId(match.id);
    setStudentId(matchStudent?.id ?? "");
    setMatchNotice(
      matchStudent
        ? `Selected ${sample.studentName} and ${match.title} to match the sample photo.`
        : `Selected ${match.title} to match the sample photo.`
    );
    clearFieldError("assignment", "student");
  }

  async function addPages(items: PendingImage[]) {
    const room = MAX_SCAN_PAGES - pages.length;
    if (busy || items.length === 0 || room <= 0) {
      setPreparing(false);
      if (room <= 0) {
        setError({ field: "pages", message: `A scan holds up to ${MAX_SCAN_PAGES} pages. Remove one to add another.` });
      }
      return;
    }

    setPreparing(true);
    const added: { page: ScanPage; sample: SampleTestPhoto | null }[] = [];
    let problem: string | null =
      items.length > room ? `Only ${pluralize(room, "more page")} fit in this scan, so the rest were skipped.` : null;
    for (const item of items.slice(0, room)) {
      try {
        const prepared = await prepareScanImage(item.blob);
        // The demo scanner recognizes a sample only by its exact bytes.
        const sample = prepared.resized ? null : (item.sample ?? (await matchSamplePhoto(prepared.blob)));
        const name = item.name || `page-${pages.length + added.length + 1}.${extensionFor(prepared.type)}`;
        added.push({ page: makePage(prepared, name, sample?.id ?? null), sample });
      } catch (caught) {
        const message = caught instanceof ImagePrepError ? caught.message : "That photo couldn't be read. Try another one.";
        problem = item.name ? `${item.name}: ${message}` : message;
      }
    }
    setPreparing(false);

    if (added.length > 0) {
      setPages((current) => [...current, ...added.map((entry) => entry.page)].slice(0, MAX_SCAN_PAGES));
      if (pages.length === 0 && added[0].sample) applySample(added[0].sample);
    }
    if (problem) setError({ field: "pages", message: problem });
    else clearFieldError("pages");
  }

  function handleFileList(files: FileList | null) {
    if (!files || files.length === 0) return;
    void addPages(Array.from(files, (file) => ({ blob: file, name: file.name })));
  }

  async function pickSample(sample: SampleTestPhoto) {
    if (busy || preparing) return;
    // addPages() clears this when the photo is ready.
    setPreparing(true);
    let blob: Blob;
    try {
      const response = await fetch(sample.src, { cache: "force-cache" });
      if (!response.ok) throw new Error("sample unavailable");
      blob = await response.blob();
    } catch {
      setPreparing(false);
      setError({ field: "pages", message: "The sample photo couldn't be loaded. Reload the page and try again." });
      return;
    }
    await addPages([{ blob, name: sample.src.split("/").pop() ?? "sample.jpg", sample }]);
  }

  function removePage(index: number) {
    const page = pages[index];
    if (!page) return;
    releasePage(page);
    setPages(pages.filter((_, position) => position !== index));
    clearFieldError("pages");
  }

  function movePage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;
    const next = [...pages];
    [next[index], next[target]] = [next[target], next[index]];
    setPages(next);
  }

  async function handleAnswerKeyFile(file: File | undefined) {
    if (!file || busy) return;
    setPreparing(true);
    try {
      const prepared = await prepareScanImage(file);
      if (answerKey) releasePage(answerKey);
      setAnswerKey(makePage(prepared, file.name || `answer-key.${extensionFor(prepared.type)}`, null));
      clearFieldError("answerKey");
    } catch (caught) {
      setError({
        field: "answerKey",
        message: caught instanceof ImagePrepError ? caught.message : "That photo couldn't be read. Try another one.",
      });
    } finally {
      setPreparing(false);
    }
  }

  function removeAnswerKey() {
    if (answerKey) releasePage(answerKey);
    setAnswerKey(null);
    clearFieldError("answerKey");
  }

  function changeAssignment(value: string) {
    setAssignmentId(value);
    setMatchNotice(null);
    const next = assignments.find((option) => option.id === value);
    const nextClass = next ? classes.find((option) => option.id === next.classId) : undefined;
    if (!nextClass?.students.some((option) => option.id === studentId)) setStudentId("");
    clearFieldError("assignment", "student");
  }

  function changeStudent(value: string) {
    setStudentId(value);
    setMatchNotice(null);
    clearFieldError("student");
  }

  function fail(field: Field, message: string) {
    setError({ field, message });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || preparing) return;
    // Shown next to the button, which may be far from the photos on a phone.
    if (pages.length === 0) return setError({ message: "Add at least one photo of the test first." });
    if (!assignment) return fail("assignment", "Choose the assignment this test belongs to.");
    if (assignment.questionCount === 0) {
      return fail("assignment", "This assignment has no answer key questions yet. Add them before scanning.");
    }
    if (!student) return fail("student", "Choose the student whose test this is.");
    if (paper && !paper.replaceable) {
      return fail("student", `${firstName(student.name)}'s paper is ${paper.label.toLowerCase()}, so it can't be replaced.`);
    }

    // A safety net: prepareScanImage() already fits each photo to its share
    // of the request. /api/grade checks the same total.
    const tooLarge = scanPhotosProblem([...pages.map((page) => page.blob.size), answerKey?.blob.size ?? 0]);
    if (tooLarge) return setError({ message: tooLarge });

    const form = new FormData();
    form.set("assignmentId", assignment.id);
    form.set("studentId", student.id);
    pages.forEach((page) => form.append("pages", page.blob, page.name));
    if (answerKey) form.set("answerKey", answerKey.blob, answerKey.name);
    if (showTranscription && transcription.trim()) form.set("transcription", transcription);

    setError(null);
    setCameraOpen(false);
    setPhase("grading");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch("/api/grade", { method: "POST", body: form, signal: controller.signal });
      const data = (await response.json().catch(() => null)) as ScanGradeResponse | null;
      if (!data || typeof data !== "object" || typeof data.ok !== "boolean") {
        setPhase("idle");
        // A 413 that isn't JSON came from the host before the route ran.
        setError({ message: response.status === 413 ? SCAN_PHOTOS_TOO_LARGE_MESSAGE : "Grading failed. Try again." });
        return;
      }
      if (!data.ok) {
        setPhase("idle");
        if (data.code === "NEEDS_TRANSCRIPTION") {
          setNeedsTranscription(true);
          setError({ field: "transcription", code: data.code, message: data.error });
        } else {
          setError({ message: data.error });
        }
        return;
      }
      setResult(data);
      setPhase("done");
      toast.success("Graded draft is ready in To review", {
        description: `${data.studentName} · ${data.assignmentTitle}`,
      });
      router.refresh();
    } catch {
      if (controller.signal.aborted) return;
      setPhase("idle");
      setError({ message: "Couldn't reach Markwise. Check your connection and try again." });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  function scanAnother() {
    pages.forEach(releasePage);
    if (answerKey) releasePage(answerKey);
    setPages([]);
    setAnswerKey(null);
    setTranscription("");
    setNeedsTranscription(false);
    setResult(null);
    setError(null);
    setMatchNotice(null);
    setStudentId("");
    setPhase("idle");
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy || preparing) return;
    const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/") || !file.type);
    if (files.length > 0) void addPages(files.map((file) => ({ blob: file, name: file.name })));
  }

  const pagesError = fieldMessage(error, "pages");

  // The three ways to add pages. Inside the empty drop zone they are centered;
  // once pages exist they sit under the thumbnails.
  const captureButtons = (
    <>
      <Button
        type="button"
        variant="tonal"
        onClick={() => setCameraOpen((open) => !open)}
        disabled={busy}
        aria-pressed={cameraOpen}
      >
        <Camera aria-hidden />
        {cameraOpen ? "Close camera" : "Use camera"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy || full || preparing}
      >
        <Upload aria-hidden />
        Upload photos
      </Button>
      <SampleMenu
        onPick={(sample) => void pickSample(sample)}
        disabled={busy || full || preparing}
        visionEnabled={visionEnabled}
      />
    </>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
      <Card className="min-w-0">
        <div className="flex items-start gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0 flex-1 space-y-0.5">
            <CardTitle>
              <h2>Test pages</h2>
            </CardTitle>
            <CardDescription>Photograph or upload each page of one student&apos;s test, in order.</CardDescription>
          </div>
          <span
            className="tabular inline-flex h-7 shrink-0 items-center rounded-full bg-secondary px-3 text-xs font-medium text-secondary-foreground"
            aria-label={`${pages.length} of ${MAX_SCAN_PAGES} pages added`}
          >
            {pages.length}/{MAX_SCAN_PAGES}
          </span>
        </div>

        <div className="space-y-4 px-4 py-5 sm:px-6 sm:py-6">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            capture="environment"
            multiple
            hidden
            onChange={(event) => {
              handleFileList(event.target.files);
              event.target.value = "";
            }}
          />

          {cameraOpen && !busy ? (
            <CameraCapture
              onCapture={(blob) => void addPages([{ blob, name: `camera-page-${pages.length + 1}.jpg` }])}
              onClose={() => setCameraOpen(false)}
              pageNumber={pages.length + 1}
              canCapture={!full && !preparing}
              disabled={busy}
            />
          ) : null}

          <div
            onDragOver={(event) => {
              event.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn("rounded-xl transition-colors", busy && "pointer-events-none opacity-60")}
            aria-describedby={pagesError ? "scan-pages-error" : undefined}
          >
            {pages.length === 0 ? (
              <div
                className={cn(
                  "flex min-h-72 flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-10 text-center transition-colors",
                  dragging ? "border-primary/60 bg-primary-soft/40" : "border-input/30 bg-background"
                )}
              >
                <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
                  <ImagePlus className="size-6" aria-hidden />
                </div>
                <p className="font-display text-lg font-medium text-foreground">Add photos of one student&apos;s test</p>
                <p className="mt-1 max-w-md text-[0.9375rem] text-pretty text-muted-foreground">
                  Drop photos here, or choose how to add them. Up to {MAX_SCAN_PAGES} pages, in order. JPEG, PNG, or
                  WebP; large photos are resized for upload.
                </p>
                <div className="mt-6 flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
                  {captureButtons}
                </div>
              </div>
            ) : (
              <div className={cn("rounded-xl", dragging && "ring-2 ring-primary/40 ring-offset-4 ring-offset-card")}>
                <PageList
                  pages={pages}
                  maxPages={MAX_SCAN_PAGES}
                  onMove={movePage}
                  onRemove={removePage}
                  onAdd={() => fileInputRef.current?.click()}
                  disabled={busy || preparing}
                />
              </div>
            )}
          </div>

          {/* Outside the dimmed drop target, so disabled buttons don't stack two opacities. */}
          {pages.length > 0 ? (
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {captureButtons}
            </div>
          ) : null}

          {preparing ? (
            <p className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground" role="status">
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
              Preparing photo…
            </p>
          ) : null}
          <FieldError id="scan-pages-error" message={pagesError} />
        </div>

        <div className="space-y-3 border-t border-border px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <KeyRound className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  Answer key photo <span className="font-normal text-muted-foreground">(optional)</span>
                </p>
                <p className="text-[0.8125rem] text-pretty text-muted-foreground">
                  {visionEnabled
                    ? "GPT-4o reads the expected answers from it. Without one, it uses the assignment's answer key."
                    : "The demo scanner always grades against the assignment's answer key."}
                </p>
              </div>
            </div>
            {!answerKey ? (
              <Button
                type="button"
                variant="outline"
                className="w-full shrink-0 sm:w-auto"
                onClick={() => answerKeyInputRef.current?.click()}
                disabled={busy || preparing}
              >
                <KeyRound aria-hidden />
                Add answer key photo
              </Button>
            ) : null}
          </div>
          {answerKey ? (
            <div className="flex items-center gap-3 rounded-xl border border-border p-2.5 pr-1.5">
              {/* Plain <img>: a local object URL. */}
              <img
                src={answerKey.url}
                alt="Answer key photo"
                className="h-14 w-11 shrink-0 rounded-md border border-border bg-paper object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{answerKey.name}</p>
                <p className="tabular text-xs text-muted-foreground">{describeDimensions(answerKey)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={removeAnswerKey}
                disabled={busy}
                aria-label="Remove answer key photo"
              >
                <X />
              </Button>
            </div>
          ) : null}
          <input
            ref={answerKeyInputRef}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(event) => {
              void handleAnswerKeyFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <FieldError id="scan-answer-key-error" message={fieldMessage(error, "answerKey")} />
        </div>
      </Card>

      <div ref={sideRef} className="min-w-0 scroll-mt-24 xl:sticky xl:top-24">
        {phase === "grading" && assignment && student ? (
          <ScanProgress
            visionEnabled={visionEnabled}
            studentName={student.name}
            assignmentTitle={assignment.title}
            pageCount={pages.length}
            typedTranscription={showTranscription}
          />
        ) : phase === "done" && result ? (
          <div ref={resultRef} tabIndex={-1} className="rounded-xl outline-none">
            <ScanResult result={result} onScanAnother={scanAnother} />
          </div>
        ) : (
          <Card>
            <CardHeader className="px-4 pt-5 sm:px-6 sm:pt-6">
              <CardTitle>
                <h2>Grade this test</h2>
              </CardTitle>
              <CardDescription>Choose where the draft goes. It lands in To review.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pt-5 pb-5 sm:px-6 sm:pb-6">
              <form onSubmit={submit} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-5">
                {matchNotice ? (
                  <p
                    className="flex items-start gap-2 rounded-xl bg-primary-soft px-3.5 py-2.5 text-[0.8125rem] text-pretty text-primary-soft-foreground"
                    role="status"
                  >
                    <CircleCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    {matchNotice}
                  </p>
                ) : null}

                {/* min-w-0: a long title truncates in its select instead of widening the card. */}
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="scan-assignment">Assignment</Label>
                  <AssignmentPicker
                    id="scan-assignment"
                    classes={classes}
                    assignments={assignments}
                    value={assignmentId}
                    onChange={changeAssignment}
                    invalid={error?.field === "assignment"}
                    describedBy={error?.field === "assignment" ? "scan-assignment-error" : undefined}
                    disabled={busy}
                  />
                  {assignment ? (
                    <p className="flex min-w-0 items-center gap-2 text-[0.8125rem] text-muted-foreground">
                      {klass ? <ClassAvatar name={klass.name} className="size-5 text-[0.625rem]" /> : null}
                      <span className="min-w-0">
                        {klass?.label ? `${klass.label} · ` : ""}
                        {assignmentHint(assignment)}
                      </span>
                    </p>
                  ) : null}
                  <FieldError id="scan-assignment-error" message={fieldMessage(error, "assignment")} />
                </div>

                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="scan-student">Student</Label>
                  <StudentPicker
                    id="scan-student"
                    students={students}
                    assignmentId={assignmentId}
                    papers={papers}
                    value={student ? studentId : ""}
                    onChange={changeStudent}
                    invalid={error?.field === "student"}
                    describedBy={error?.field === "student" ? "scan-student-error" : undefined}
                    disabled={busy}
                  />
                  {student && paper ? (
                    <p
                      className={cn(
                        "text-[0.8125rem] text-pretty",
                        paper.replaceable ? "text-muted-foreground" : "text-destructive"
                      )}
                    >
                      {paper.replaceable
                        ? `${firstName(student.name)} already has a paper here (${paper.label.toLowerCase()}). Scanning replaces it and any draft edits.`
                        : `${firstName(student.name)}'s paper is ${paper.label.toLowerCase()}, so it can't be replaced.`}
                    </p>
                  ) : null}
                  <FieldError id="scan-student-error" message={fieldMessage(error, "student")} />
                </div>

                {showTranscription ? (
                  <div className="grid min-w-0 gap-2">
                    <Label htmlFor="scan-transcription">Transcription (demo mode)</Label>
                    <Textarea
                      ref={transcriptionRef}
                      id="scan-transcription"
                      value={transcription}
                      onChange={(event) => {
                        setTranscription(event.target.value);
                        clearFieldError("transcription");
                      }}
                      rows={6}
                      maxLength={MAX_PAPER_CHARS}
                      placeholder={"Q1. ...\nQ2. ..."}
                      className="max-h-80 min-h-32"
                      aria-invalid={error?.field === "transcription" ? true : undefined}
                      aria-describedby={
                        error?.field === "transcription"
                          ? "scan-transcription-help scan-transcription-error"
                          : "scan-transcription-help"
                      }
                      disabled={busy}
                    />
                    <p id="scan-transcription-help" className="text-[0.8125rem] text-pretty text-muted-foreground">
                      The demo scanner can&apos;t read handwriting. Type each answer on its own line, starting with its
                      number (Q1., Q2.). Sample photos don&apos;t need this.
                    </p>
                    <FieldError id="scan-transcription-error" message={fieldMessage(error, "transcription")} />
                  </div>
                ) : null}

                {error && !error.field ? <FormAlert>{error.message}</FormAlert> : null}

                <Button type="submit" size="lg" className="w-full" disabled={busy || preparing}>
                  {visionEnabled ? <ScanLine aria-hidden /> : <FlaskConical aria-hidden />}
                  {visionEnabled ? "Grade with GPT-4o" : "Grade with demo scanner"}
                </Button>
                <p className="flex items-start gap-2 text-[0.8125rem] text-pretty text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                  The draft lands in To review. Nothing publishes until you approve and return it.
                </p>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
