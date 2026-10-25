"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { SubmissionRowData } from "@/components/assignments/types";
import { isConfidence, type Confidence, type GraderKind } from "@/lib/constants";
import { pluralize } from "@/lib/format";
import type { GraderInfo } from "@/lib/grading/config";

/**
 * Client-side batch AI pass. Papers are graded one at a time through
 * POST /api/submissions/[id]/grade, so each request stays short, progress is
 * real, and a stop request takes effect after the current paper. Results land
 * in the review queue; nothing here can publish a grade.
 */

export type LiveRowState =
  | { phase: "queued" }
  | { phase: "grading" }
  | { phase: "done"; confidence: Confidence | null; flagCount: number; grader: GraderKind }
  | { phase: "failed"; error: string };

export type BatchRun = {
  total: number;
  /** Papers finished so far (graded or failed). */
  processed: number;
  succeeded: number;
  failed: number;
  status: "running" | "stopping" | "done" | "stopped";
};

type GradeOutcome =
  | { ok: true; confidence: Confidence | null; flagCount: number; grader: GraderKind }
  | { ok: false; error: string };

type BatchGradingContextValue = {
  assignmentId: string;
  graderInfo: GraderInfo;
  rows: SubmissionRowData[];
  live: Record<string, LiveRowState>;
  run: BatchRun | null;
  isRunning: boolean;
  /** Papers the AI pass can run on now (SUBMITTED or GRADING_FAILED). */
  gradableIds: string[];
  /** Papers waiting in the review queue, including ones graded moments ago. */
  reviewCount: number;
  start: (ids?: string[]) => void;
  stop: () => void;
  dismiss: () => void;
};

const BatchGradingContext = createContext<BatchGradingContextValue | null>(null);

export const GRADABLE_STATUSES = ["SUBMITTED", "GRADING_FAILED"];

export function useBatchGrading(): BatchGradingContextValue {
  const value = useContext(BatchGradingContext);
  if (!value) throw new Error("useBatchGrading must be used inside <BatchGradingProvider>.");
  return value;
}

function errorFrom(body: unknown): string | null {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string" && body.error) {
    return body.error;
  }
  return null;
}

async function requestGrade(submissionId: string): Promise<GradeOutcome> {
  let response: Response;
  try {
    response = await fetch(`/api/submissions/${encodeURIComponent(submissionId)}/grade`, {
      method: "POST",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Network error. Check your connection, then retry." };
  }

  const body: unknown = await response.json().catch(() => null);
  if (response.ok && body && typeof body === "object" && "ok" in body && body.ok === true && "submission" in body) {
    const submission = body.submission as { confidence?: unknown; flagCount?: unknown; grader?: unknown };
    return {
      ok: true,
      confidence: typeof submission.confidence === "string" && isConfidence(submission.confidence) ? submission.confidence : null,
      flagCount: typeof submission.flagCount === "number" ? submission.flagCount : 0,
      grader: submission.grader === "claude" ? "claude" : "demo",
    };
  }
  if (response.status === 401) return { ok: false, error: "Your session ended. Sign in again to keep grading." };
  return { ok: false, error: errorFrom(body) ?? "The AI pass failed. Try again." };
}

export function BatchGradingProvider({
  assignmentId,
  graderInfo,
  rows,
  children,
}: {
  assignmentId: string;
  graderInfo: GraderInfo;
  rows: SubmissionRowData[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [live, setLive] = useState<Record<string, LiveRowState>>({});
  const [run, setRun] = useState<BatchRun | null>(null);
  const [, startRefresh] = useTransition();
  const runningRef = useRef(false);
  const stopRef = useRef(false);
  const mountedRef = useRef(true);

  const isRunning = run?.status === "running" || run?.status === "stopping";

  const gradableIds = useMemo(
    () =>
      rows
        .filter((row) => GRADABLE_STATUSES.includes(row.status))
        .filter((row) => {
          const phase = live[row.id]?.phase;
          return phase !== "done" && phase !== "queued" && phase !== "grading";
        })
        .map((row) => row.id),
    [rows, live]
  );

  const reviewCount = useMemo(
    () =>
      rows.filter(
        (row) => row.status === "NEEDS_REVIEW" || (live[row.id]?.phase === "done" && row.status !== "NEEDS_REVIEW")
      ).length,
    [rows, live]
  );

  // Keep the latest list for start() without re-creating it on every render.
  const gradableRef = useRef(gradableIds);
  useEffect(() => {
    gradableRef.current = gradableIds;
  }, [gradableIds]);

  // Leaving the page stops the batch after the paper in flight.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopRef.current = true;
    };
  }, []);

  // A full page unload would silently drop the rest of the batch: warn first.
  useEffect(() => {
    if (!isRunning) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isRunning]);

  const start = useCallback(
    (requested?: string[]) => {
      if (runningRef.current) return;
      const ids = Array.from(new Set(requested ?? gradableRef.current));
      if (ids.length === 0) return;

      runningRef.current = true;
      stopRef.current = false;

      setLive((current) => {
        const next = { ...current };
        for (const id of ids) next[id] = { phase: "queued" };
        return next;
      });
      setRun({ total: ids.length, processed: 0, succeeded: 0, failed: 0, status: "running" });

      void (async () => {
        let processed = 0;
        let succeeded = 0;
        let failed = 0;

        for (const id of ids) {
          if (stopRef.current) break;
          setLive((current) => ({ ...current, [id]: { phase: "grading" } }));
          const outcome = await requestGrade(id);
          processed++;
          if (outcome.ok) {
            succeeded++;
            setLive((current) => ({
              ...current,
              [id]: { phase: "done", confidence: outcome.confidence, flagCount: outcome.flagCount, grader: outcome.grader },
            }));
          } else {
            failed++;
            setLive((current) => ({ ...current, [id]: { phase: "failed", error: outcome.error } }));
          }
          setRun((current) => (current ? { ...current, processed, succeeded, failed } : current));
        }

        runningRef.current = false;
        const stopped = processed < ids.length;
        if (stopped) {
          // Papers that never started go back to their normal row state.
          const skipped = new Set(ids.slice(processed));
          setLive((current) =>
            Object.fromEntries(Object.entries(current).filter(([id]) => !skipped.has(id)))
          );
        }
        setRun({ total: ids.length, processed, succeeded, failed, status: stopped ? "stopped" : "done" });

        if (!mountedRef.current) return;

        if (succeeded > 0) {
          toast.success(`${pluralize(succeeded, "paper")} ${succeeded === 1 ? "is" : "are"} ready for your review`, {
            action: {
              label: "Review now",
              onClick: () => router.push(`/review?assignment=${encodeURIComponent(assignmentId)}`),
            },
          });
        }
        if (failed > 0) {
          toast.error(`${pluralize(failed, "paper")} could not be graded`, {
            description: "Use Retry in the submissions table to try again.",
          });
        }
        if (stopped) {
          toast.message("AI pass stopped", {
            description: `${pluralize(ids.length - processed, "paper")} not graded yet.`,
          });
        }
        startRefresh(() => router.refresh());
      })();
    },
    [assignmentId, router]
  );

  const stop = useCallback(() => {
    if (!runningRef.current) return;
    stopRef.current = true;
    setRun((current) => (current && current.status === "running" ? { ...current, status: "stopping" } : current));
  }, []);

  const dismiss = useCallback(() => {
    if (runningRef.current) return;
    setRun(null);
  }, []);

  const value = useMemo<BatchGradingContextValue>(
    () => ({
      assignmentId,
      graderInfo,
      rows,
      live,
      run,
      isRunning,
      gradableIds,
      reviewCount,
      start,
      stop,
      dismiss,
    }),
    [assignmentId, graderInfo, rows, live, run, isRunning, gradableIds, reviewCount, start, stop, dismiss]
  );

  return <BatchGradingContext.Provider value={value}>{children}</BatchGradingContext.Provider>;
}
