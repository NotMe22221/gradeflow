"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Flag, LoaderCircle, Target } from "@/components/icons";
import { toast } from "sonner";

import { useDestinationTarget } from "@/components/app-shell/destination";
import { EmptyState } from "@/components/empty-state";
import { SectionHeading } from "@/components/layout-editor/section-heading";
import { GoalEngineBadge } from "@/components/student/goal-engine-badge";
import { GoalPlanResult } from "@/components/student/goal-plan-result";
import { usePlannerBridge } from "@/components/student/planner-bridge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MAX_GOAL_CHARS } from "@/lib/goals/parse";
import type { GoalEngine, GoalPlannerResponse, GoalPlanView } from "@/lib/goals/types";
import { scrollBehavior } from "@/lib/motion";
import { GOAL_PLANNER_ID } from "@/lib/search/catalog";
import { cn } from "@/lib/utils";

export type PlannerClass = { id: string; name: string; section: string | null };

type PlanResult = { plan: GoalPlanView; engine: GoalEngine | null; model: string | null };

const EXAMPLES = ["I need an A", "At least a B+", "Just pass"];

/**
 * Goal planner. The student types a goal; the server reads it (gpt-4o-mini,
 * or the labelled demo parser) and code computes the exact score needed on
 * each remaining assignment from their teacher-approved grades. The badge
 * beside the examples says which engine reads the goal.
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
  /** The field the error is about: it gets aria-invalid and points at the message. */
  const [errorField, setErrorField] = useState<"goal" | "class">("goal");
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
  // the goal. Each request is handled once (a refresh re-renders with new props),
  // and one made before this planner mounted (Home re-arranged) is not replayed.
  const request = bridge?.request ?? null;
  const handledNonce = useRef(request?.nonce ?? 0);
  useEffect(() => {
    if (!request || request.nonce === handledNonce.current) return;
    handledNonce.current = request.nonce;
    if (classes.some((klass) => klass.id === request.classId)) {
      setClassId(request.classId);
      setError(null);
      setNote(null);
    }
    sectionRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    inputRef.current?.focus({ preventScroll: true });
  }, [request, classes]);

  // Goals (bottom bar, rail, drawer, search) is /student#goal-planner. Arriving from another
  // page, the router tries the hash while Home's loading skeleton is up and gives up, so the
  // planner scrolls itself into view and takes focus once it mounts. Scrolled away, the URL
  // drops the hash and Home is the current destination again.
  useDestinationTarget(GOAL_PLANNER_ID, sectionRef);

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
      setErrorField("goal");
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
        const field = data && !data.ok && data.code === "NEEDS_CLASS" ? "class" : "goal";
        setError(message);
        setErrorField(field);
        // The role="alert" message announces the error; the status region only clears "Planning…".
        setAnnouncement("");
        (field === "class" ? selectRef : inputRef).current?.focus();
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
      setError("Couldn't reach GradeSmart. Check your connection and try again.");
      setErrorField("goal");
      setAnnouncement("");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPending(false);
      }
    }
  }

  return (
    <section
      ref={sectionRef}
      id={GOAL_PLANNER_ID}
      aria-labelledby={headingId}
      className="min-w-0 scroll-mt-24"
    >
      <SectionHeading
        id={headingId}
        title="Goal planner"
        description="Type the grade you want. GradeSmart works out the exact score you need on everything left."
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <form onSubmit={plan} noValidate className="space-y-3 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] sm:items-end">
            {/* flex + gap, not space-y: Radix adds a hidden native <select> last, which space-y would count. */}
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor={classSelectId}>Class</Label>
              <Select
                value={classId}
                onValueChange={(value) => {
                  setClassId(value);
                  setError(null);
                  setNote(null);
                }}
              >
                <SelectTrigger
                  ref={selectRef}
                  id={classSelectId}
                  className="w-full"
                  aria-invalid={error && errorField === "class" ? true : undefined}
                  aria-describedby={error && errorField === "class" ? errorId : undefined}
                >
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
            <div className="flex min-w-0 flex-col gap-1.5">
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
                aria-invalid={error && errorField === "goal" ? true : undefined}
                aria-describedby={error && errorField === "goal" ? errorId : undefined}
              />
            </div>
            {/* Tonal: on Home the inbox's action is the one filled button. */}
            <Button type="submit" variant="tonal" disabled={pending} className="w-full sm:w-auto">
              {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Target aria-hidden />}
              {pending ? "Planning…" : "Plan it"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.8125rem] text-muted-foreground">Try</span>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => applyExample(example)}
                disabled={pending}
                className="inline-flex h-8 items-center rounded-lg border border-input bg-card px-3 text-[0.8125rem] font-medium text-muted-foreground transition-colors outline-none hover:bg-foreground/[0.04] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-hidden disabled:opacity-50"
              >
                {example}
              </button>
            ))}
            <GoalEngineBadge engine={engine.engine} model={engine.model} className="ml-auto" />
          </div>

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
        </form>

        <div
          className={cn("border-t border-border px-4 py-6 transition-opacity sm:px-5", pending && "opacity-60")}
          aria-busy={pending}
        >
          <p className="sr-only" role="status" aria-live="polite">
            {announcement}
          </p>
          {note ? <p className="mb-4 text-[0.875rem] font-medium text-foreground">{note}</p> : null}
          {pending && !current ? (
            <PlanSkeleton />
          ) : current ? (
            <GoalPlanResult plan={current.plan} engine={current.engine} model={current.model} />
          ) : (
            <EmptyState
              icon={Flag}
              title={selectedClass ? `No goal set for ${selectedClass.name} yet.` : "Pick a class to plan a goal."}
              description="Tell the planner what you're aiming for and it shows the exact score you need on each remaining assignment."
              className="border-0 bg-transparent py-2"
            />
          )}
        </div>
      </div>
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
