"use client";

import { useEffect, useState } from "react";
import { Circle, CircleCheck, FlaskConical, LoaderCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

type Step = { label: string; /** ms after start when the step becomes current */ at: number };

const VISION_STEPS: Step[] = [
  { label: "Uploading photos", at: 0 },
  { label: "Reading handwriting", at: 1500 },
  { label: "Drafting scores against the answer key", at: 9000 },
  { label: "Checking evidence and flags", at: 18000 },
];

function demoSteps(typed: boolean): Step[] {
  return [
    { label: "Uploading photos", at: 0 },
    { label: typed ? "Reading your transcription" : "Matching the sample photo", at: 400 },
    { label: "Drafting scores against the answer key", at: 900 },
    { label: "Checking evidence and flags", at: 1500 },
  ];
}

/**
 * Shown while POST /api/grade runs. The server does not stream progress, so
 * the steps advance on typical timings and the last one stays current until
 * the draft arrives.
 */
export function ScanProgress({
  visionEnabled,
  studentName,
  assignmentTitle,
  pageCount,
  typedTranscription,
}: {
  visionEnabled: boolean;
  studentName: string;
  assignmentTitle: string;
  pageCount: number;
  typedTranscription: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = window.setInterval(() => setElapsed(Date.now() - start), 200);
    return () => window.clearInterval(timer);
  }, []);

  const steps = visionEnabled ? VISION_STEPS : demoSteps(typedTranscription);
  let current = 0;
  steps.forEach((step, index) => {
    if (elapsed >= step.at) current = index;
  });
  const seconds = Math.floor(elapsed / 1000);

  return (
    <Card aria-busy="true" aria-label="Grading progress" className="min-w-0">
      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold text-foreground">Grading {studentName}&apos;s test</p>
            <p className="truncate text-sm text-muted-foreground">
              {pluralize(pageCount, "page")} · {assignmentTitle}
            </p>
          </div>
          <span className="tabular shrink-0 text-[13px] font-medium text-muted-foreground" aria-hidden>
            {seconds} s
          </span>
        </div>

        <ol className="space-y-3" aria-live="polite">
          {steps.map((step, index) => {
            const done = index < current;
            const active = index === current;
            return (
              <li
                key={step.label}
                className={cn(
                  "flex items-center gap-3 text-sm",
                  done ? "text-foreground" : active ? "font-medium text-foreground" : "text-muted-foreground"
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? (
                  <CircleCheck className="size-4 shrink-0 text-success" aria-hidden />
                ) : active ? (
                  <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
                ) : (
                  <Circle className="size-4 shrink-0 text-border" aria-hidden />
                )}
                <span>
                  {step.label}
                  {active ? "…" : ""}
                  <span className="sr-only">{done ? " (done)" : active ? " (in progress)" : ""}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="space-y-3 rounded-lg border border-border bg-background p-4" aria-hidden>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>

        {visionEnabled ? (
          <p className="text-[13px] text-pretty text-muted-foreground">
            GPT-4o usually takes 10 to 30 seconds per test. Keep this tab open.
          </p>
        ) : (
          <p className="flex items-start gap-2 text-[13px] text-pretty text-muted-foreground">
            <FlaskConical className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Demo scanner: keyword matching against the answer key. No AI reads the photo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
