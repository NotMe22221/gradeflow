"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, LoaderCircle, Target, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { GoalEngineBadge } from "@/components/student/goal-engine-badge";
import { GoalPlanResult } from "@/components/student/goal-plan-result";
import { usePlannerBridge } from "@/components/student/planner-bridge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MAX_GOAL_CHARS } from "@/lib/goals/parse";
import type { GoalEngine, GoalPlannerResponse, GoalPlanView } from "@/lib/goals/types";
import { cn } from "@/lib/utils";

export type PlannerClass = { id: string; name: string; section: string | null };

type PlanResult = { plan: GoalPlanView; engine: GoalEngine | null; model: string | null };

const EXAMPLES = ["I need an A", "At least a B+", "Just pass"];

/**
 * AI goal-seeking planner. The student types a goal; the server reads it
 * (gpt-4o-mini, or the demo parser) and computes the exact score needed on
 * each remaining assignment from their teacher-approved grades.
 */
export function GoalPlanner({
  classes,
  savedPlans,
  defaultClassId,
  engine,
}: {
  classes: PlannerClass[];
  /** Saved goals re-planned on page load, at most one per class. */
  savedPlans: GoalPlanView[];
  defaultClassId: string | null;
  /** The engine that will read new goals. */
  engine: { engine: GoalEngine; model: string | null };
}) {
  const router = useRouter();
  const bridge = usePlannerBridge();
  const [classId, setClassId] = useState(() =>
    defaultClassId && classes.some((klass) => klass.id === defaultClassId) ? defaultClassId : (classes[0]?.id ?? "")
  );
  const [goal, setGoal] = useState("");
  const [results, setResults] = useState<Record<string, PlanResult>>(() =>
    Object.fromEntries(savedPlans.map((plan) => [plan.classId, { plan, engine: null, model: null }]))
  );
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [pending, setPending] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const headingId = useId();
  const classSelectId = useId();
  const goalInputId = useId();
  const errorId = useId();

  useEffect(() => () => abortRef.current?.abort(), []);

  // "Plan my grade" from the assignment inbox: switch class, scroll here, focus
  // the goal. Each request is handled once (a refresh re-renders with new props).
  const request = bridge?.request ?? null;
  const handledNonce = useRef(0);
  useEffect(() => {
    if (!request || request.nonce === handledNonce.current) return;
    handledNonce.current = request.nonce;
    if (classes.some((klass) => klass.id === request.classId)) {
      setClassId(request.classId);
      setError(null);
      setNote(null);
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sectionRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    inputRef.current?.focus({ preventScroll: true });
  }, [request, classes]);

  const current = results[classId] ?? null;
  const selectedClass = classes.find((klass) => klass.id === classId) ?? null;

  function applyExample(text: string) {
    setGoal(text);
    setError(null);
    inputRef.current?.focus();
  }

  async function plan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = goal.trim();
    if (!text) {
      setError("Type your goal first, like “I need a B+”.");
      inputRef.current?.focus();
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    setError(null);
    setNote(null);
    setAnnouncement("Planning your goal…");

    try {
      const response = await fetch("/api/goal-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: text, classId: classId || null }),
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => null)) as GoalPlannerResponse | null;
      if (!data || !data.ok) {
        const message = data && !data.ok ? data.error : "Your goal could not be planned. Try again.";
        setError(message);
        setAnnouncement(message);
        if (data && !data.ok && data.code === "NEEDS_CLASS") selectRef.current?.focus();
        else inputRef.current?.focus();
        return;
      }

      setResults((previous) => ({
        ...previous,
        [data.plan.classId]: { plan: data.plan, engine: data.engine, model: data.model },
      }));
      if (data.plan.classId !== classId) {
        setClassId(data.plan.classId);
        setNote(`Planned for ${data.plan.className}, the class your goal mentions.`);
      }
      setAnnouncement(`Plan ready: ${data.plan.interpretation}. ${data.plan.statusLabel}.`);
      if (data.xpAwarded > 0) {
        toast.success(`+${data.xpAwarded} XP for setting a goal.`, {
          description: "XP tracks effort. It never changes your grades.",
        });
        router.refresh();
      }
    } catch {
      if (controller.signal.aborted) return;
      const message = "Couldn't reach GradeSmart. Check your connection and try again.";
      setError(message);
      setAnnouncement(message);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPending(false);
      }
    }
  }

  return (
    <section ref={sectionRef} id="goal-planner" aria-labelledby={headingId} className="scroll-mt-20">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="min-w-0 space-y-1">
            <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
              <Target className="size-4 text-muted-foreground" aria-hidden />
              Goal planner
            </h2>
            <p className="text-sm text-pretty text-muted-foreground">
              Type the grade you want. GradeSmart works out the exact score you need on everything left.
            </p>
          </div>
          <GoalEngineBadge engine={engine.engine} model={engine.model} className="self-start" />
        </div>

        <form onSubmit={plan} noValidate className="space-y-3 px-5 py-5 sm:px-6" aria-describedby={error ? errorId : undefined}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] sm:items-end">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={classSelectId}>Class</Label>
              <Select
                value={classId}
                onValueChange={(value) => {
                  setClassId(value);
                  setError(null);
                  setNote(null);
                }}
              >
                <SelectTrigger ref={selectRef} id={classSelectId} className="w-full">
                  {/* The class name alone, so it fits; the list shows the section too. */}
                  <SelectValue placeholder="Pick a class">{selectedClass?.name}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classes.map((klass) => (
                    <SelectItem key={klass.id} value={klass.id}>
                      {klass.name}
                      {klass.section ? <span className="text-muted-foreground"> · {klass.section}</span> : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={goalInputId}>What&apos;s your goal?</Label>
              <Input
                ref={inputRef}
                id={goalInputId}
                value={goal}
                onChange={(event) => {
                  setGoal(event.target.value);
                  if (error) setError(null);
                }}
                placeholder={`I need an A in ${selectedClass?.name ?? "this class"}`}
                maxLength={MAX_GOAL_CHARS}
                autoComplete="off"
                enterKeyHint="go"
                readOnly={pending}
                aria-invalid={error ? true : undefined}
              />
            </div>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Wand2 aria-hidden />}
              {pending ? "Planning…" : "Plan it"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Try</span>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => applyExample(example)}
                disabled={pending}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-card transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>

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
        </form>

        <div className={cn("border-t border-border px-5 py-6 sm:px-6", pending && "opacity-60")} aria-busy={pending}>
          <p className="sr-only" role="status" aria-live="polite">
            {announcement}
          </p>
          {note ? <p className="mb-4 text-[13px] font-medium text-foreground/80">{note}</p> : null}
          {pending && !current ? (
            <PlanSkeleton />
          ) : current ? (
            <GoalPlanResult plan={current.plan} engine={current.engine} model={current.model} />
          ) : (
            <EmptyState
              icon={Target}
              title={selectedClass ? `No goal set for ${selectedClass.name} yet.` : "Pick a class to plan a goal."}
              description="Tell the planner what you're aiming for and it shows the exact score you need on each remaining assignment."
              className="py-10"
            />
          )}
        </div>
      </Card>
    </section>
  );
}

function PlanSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-64 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        {[0, 1, 2].map((tile) => (
          <Skeleton key={tile} className="h-16 rounded-lg sm:h-24" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    </div>
  );
}
