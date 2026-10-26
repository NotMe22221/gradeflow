"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, Copy, FileText, Info, Printer, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { BriefDocument } from "@/components/briefs/brief-document";
import { BriefEngineBadge } from "@/components/briefs/brief-engine-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { briefEngineLabel, briefToPlainText } from "@/lib/briefs/text";
import type { BriefEngine, ConferenceBriefResponse, ConferenceBriefSuccess } from "@/lib/briefs/types";
import { formatDateTime, pluralize } from "@/lib/format";

const dateLabelFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

const GENERIC_ERROR = "The brief could not be drafted. Try again.";

/*
 * Printing: the brief is also rendered into a portal on <body>, hidden on
 * screen. While a brief exists, this print stylesheet hides every other child
 * of <body> (the whole app shell) so only the brief prints, on one page.
 */
const PRINT_CSS = `
@media print {
  @page { margin: 12mm 14mm; }
  html, body { background: #fff !important; }
  body > *:not([data-brief-print-root]) { display: none !important; }
  [data-brief-print-root] { display: block !important; }
  [data-brief-print-root] * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

function isSuccess(data: unknown): data is ConferenceBriefSuccess {
  if (!data || typeof data !== "object") return false;
  const value = data as Partial<ConferenceBriefSuccess>;
  return value.ok === true && typeof value.brief === "object" && value.brief !== null && typeof value.basis === "object";
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path (e.g. clipboard permission denied).
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

function BriefSkeleton() {
  return (
    <div aria-hidden className="space-y-6 rounded-xl border border-border bg-card p-5 sm:p-8">
      <div className="space-y-3 border-b border-border pb-5">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-6 w-full max-w-lg" />
        <Skeleton className="h-4 w-64 max-w-full" />
        <Skeleton className="h-6 w-56 max-w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {[0, 1].map((column) => (
          <div key={column} className="space-y-2.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}

/**
 * "Generate conference brief": POST /api/conference-brief, then render the
 * one-page brief with Print, Copy as text, and Regenerate. The brief is a
 * draft for the teacher; it is not stored and nothing is sent to families.
 */
export function ConferenceBriefCard({
  classId,
  studentId,
  studentName,
  firstName,
  classTitle,
  publishedCount,
  engine,
  model,
}: {
  classId: string;
  studentId: string;
  studentName: string;
  firstName: string;
  classTitle: string;
  publishedCount: number;
  /** The engine a new brief would use right now (from the server, no secrets). */
  engine: BriefEngine;
  model: string | null;
}) {
  const [result, setResult] = useState<ConferenceBriefSuccess | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const focusNextResult = useRef(false);
  const headingId = useId();

  useEffect(() => () => abortRef.current?.abort(), []);

  // Move focus to the new brief's headline so screen readers announce it.
  useEffect(() => {
    if (!result || !focusNextResult.current) return;
    focusNextResult.current = false;
    document.getElementById(headingId)?.focus({ preventScroll: false });
  }, [result, headingId]);

  const generate = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/conference-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, studentId }),
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => null)) as ConferenceBriefResponse | null;
      if (controller.signal.aborted) return;
      if (!response.ok || !isSuccess(data)) {
        setError(data && data.ok === false && typeof data.error === "string" ? data.error : GENERIC_ERROR);
        return;
      }
      focusNextResult.current = true;
      setResult(data);
    } catch {
      if (controller.signal.aborted) return;
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPending(false);
      }
    }
  }, [classId, studentId]);

  const dateLabel = result ? dateLabelFormatter.format(new Date(result.generatedAt)) : "";
  const engineNote = result ? briefEngineLabel(result.engine, result.model) : "";

  const onCopy = useCallback(async () => {
    if (!result) return;
    const text = briefToPlainText(result.brief, {
      studentName,
      classTitle,
      dateLabel,
      basis: result.basis,
      engine: result.engine,
      model: result.model,
    });
    if (await copyText(text)) toast.success("Brief copied as text.");
    else toast.error("Couldn't copy. Select the brief and copy it instead.");
  }, [result, studentName, classTitle, dateLabel]);

  const canGenerate = publishedCount > 0;
  const shownEngine = result?.engine ?? engine;
  const shownModel = result ? result.model : model;

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="flex-row flex-wrap items-start gap-x-4 gap-y-3 px-5 pt-5 pb-4 sm:flex-nowrap sm:px-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
          <FileText className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 basis-48 space-y-1">
          <CardTitle>
            <h2>Conference brief</h2>
          </CardTitle>
          <CardDescription className="text-pretty">
            {canGenerate
              ? `A one-page summary for a parent-teacher conference, drafted from ${pluralize(publishedCount, "approved grade")}.`
              : "A one-page summary for a parent-teacher conference, drafted from approved grades."}
          </CardDescription>
        </div>
        <CardAction className="ml-14 shrink-0 sm:ml-auto">
          <BriefEngineBadge engine={shownEngine} model={shownModel} />
        </CardAction>
      </CardHeader>

      <div className="px-5 pb-6 sm:px-6">
        <div aria-live="polite" className="sr-only">
          {pending ? "Drafting the brief." : result ? "Brief ready." : ""}
        </div>

        {error ? (
          <div
            role="alert"
            className="mb-4 flex flex-col gap-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="flex items-start gap-2">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </p>
            {canGenerate ? (
              <Button variant="outline" size="sm" onClick={generate} disabled={pending} className="self-start sm:self-auto">
                Try again
              </Button>
            ) : null}
          </div>
        ) : null}

        {pending ? (
          <div aria-busy className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4 animate-pulse" aria-hidden />
              Drafting the brief from approved grades…
            </p>
            <BriefSkeleton />
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="tabular text-xs text-muted-foreground">
                Generated <time dateTime={result.generatedAt}>{formatDateTime(result.generatedAt)}</time>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer aria-hidden />
                  Print
                </Button>
                <Button variant="outline" onClick={onCopy}>
                  <Copy aria-hidden />
                  Copy as text
                </Button>
                <Button variant="text" onClick={generate} className="px-4 has-[>svg]:pr-4 has-[>svg]:pl-3">
                  <RefreshCw aria-hidden />
                  Regenerate
                </Button>
              </div>
            </div>

            <p className="flex items-start gap-2.5 rounded-xl bg-secondary px-4 py-3 text-[13px] text-pretty text-secondary-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <span className="font-medium">Review before sharing with families.</span>{" "}
                {result.engine === "demo"
                  ? "This demo brief comes from a local template, not AI. It uses approved grades only."
                  : "AI drafts can be wrong. It uses approved grades only and is not saved."}
              </span>
            </p>

            <div className="rounded-xl border border-border bg-card p-5 sm:p-8">
              <BriefDocument
                brief={result.brief}
                basis={result.basis}
                studentName={studentName}
                classTitle={classTitle}
                dateLabel={dateLabel}
                engineNote={engineNote}
                headingId={headingId}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-xl bg-secondary p-5 md:flex-row md:items-center md:justify-between md:gap-6">
            <p className="text-sm leading-6 text-pretty text-secondary-foreground">
              {canGenerate
                ? "Strengths, growth areas, talking points, next steps, and questions for the family. Built from approved grades, your comments, upcoming work, and engagement. Nothing is saved or sent."
                : `Approve and return a grade for ${firstName} to generate a brief. Briefs use teacher-approved grades only.`}
            </p>
            <Button onClick={generate} disabled={!canGenerate} className="shrink-0">
              <Sparkles aria-hidden />
              Generate conference brief
            </Button>
          </div>
        )}
      </div>

      {result && typeof document !== "undefined"
        ? createPortal(
            <div data-brief-print-root className="hidden bg-white text-black">
              <style>{PRINT_CSS}</style>
              <BriefDocument
                brief={result.brief}
                basis={result.basis}
                studentName={studentName}
                classTitle={classTitle}
                dateLabel={dateLabel}
                engineNote={engineNote}
                variant="print"
              />
            </div>,
            document.body
          )
        : null}
    </Card>
  );
}
