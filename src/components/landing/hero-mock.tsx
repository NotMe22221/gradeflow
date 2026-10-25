import { Camera, Check, ChevronRight, CircleCheck, FileText, Flag, ShieldCheck, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
 * A static, non-interactive preview of the review screen, built from the same
 * tokens as the real one. Everything inside is decorative (aria-hidden); the
 * figure carries a text description for screen readers. Names and text are
 * synthetic.
 */

const EVIDENCE = "students average only 6.6 hours of sleep on school nights";

export function HeroMock({ className }: { className?: string }) {
  return (
    <figure
      role="img"
      aria-label="Preview of the GradeSmart AI review screen: a student paper with a highlighted evidence quote beside rubric scores the AI suggested, a high confidence badge, and an Approve and publish button the teacher must press. Beside it, a review queue holds the essay and two photographed handwritten tests."
      className={cn("relative mx-auto w-full max-w-5xl", className)}
    >
      <div aria-hidden className="pointer-events-none select-none">
        <div className="rounded-2xl border border-border bg-secondary/70 p-1.5 shadow-raised sm:p-2">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <WindowBar />
            <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <PaperPane />
              <RubricPane />
            </div>
            <ActionBar />
          </div>
        </div>
        <QueueCard />
      </div>
    </figure>
  );
}

function WindowBar() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-3 py-2.5 sm:px-4">
      <div className="hidden gap-1.5 sm:flex">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
      </div>
      <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground sm:ml-2">
        <span className="shrink-0 font-medium text-foreground">Review queue</span>
        <ChevronRight className="hidden size-3 shrink-0 sm:block" />
        <span className="hidden truncate sm:inline">
          Persuasive Essay: Should Our School Start the Day Later?
        </span>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="tabular hidden text-xs text-muted-foreground lg:inline">1 of 3</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success-soft-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          High confidence
        </span>
      </div>
    </div>
  );
}

function PaperPane() {
  return (
    <div className="border-b border-border bg-background p-4 sm:p-6 md:border-r md:border-b-0">
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground ring-1 ring-border">
          RT
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">Rowan Thistlewood</p>
          <p className="tabular truncate text-xs text-muted-foreground">Submitted 2h ago · 486 words</p>
        </div>
      </div>
      <div className="mt-4 space-y-3 rounded-lg border border-border bg-card px-4 py-4 text-[13px] leading-6 text-foreground/90 shadow-card sm:px-5 sm:py-5">
        <p className="hidden sm:block">
          Every morning at 7:25, the hallway outside the science wing is full of students who look like they
          are sleepwalking. I am usually one of them.
        </p>
        <p>
          The strongest reason for the change is sleep. According to the Cedar Ridge Student Sleep Survey,{" "}
          <mark className="rounded-sm bg-highlight box-decoration-clone px-0.5 text-foreground">
            <span className="tabular mr-1 inline-flex h-4 min-w-4 -translate-y-px items-center justify-center rounded-full bg-highlight-strong px-1 align-middle text-[10px] leading-none font-semibold">
              2
            </span>
            {EVIDENCE}
          </mark>
          . That is well below what our health class says teenagers need.
        </p>
        <p className="hidden text-foreground/45 sm:block">
          That extra hour would show up in our classrooms. The same survey found that 71 percent of students
          feel tired during first period.
        </p>
      </div>
    </div>
  );
}

function RubricPane() {
  return (
    <div className="space-y-3 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Rubric</p>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="size-3" />
          AI first pass
        </span>
      </div>
      <MockCriterion number={1} title="Thesis and position" score={5} max={5} />
      <MockCriterion number={2} title="Evidence and reasoning" score={8} max={10} expanded />
      <MockCriterion number={3} title="Counterargument" score={4} max={5} className="hidden sm:block" />
    </div>
  );
}

function MockCriterion({
  number,
  title,
  score,
  max,
  expanded = false,
  className,
}: {
  number: number;
  title: string;
  score: number;
  max: number;
  expanded?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-3 shadow-card", className)}>
      <div className="flex items-start gap-2.5">
        <span className="tabular mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground ring-1 ring-border">
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] leading-5 font-semibold text-foreground">{title}</p>
          <span className="tabular mt-1 inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-px text-[11px] font-medium text-muted-foreground">
            <Sparkles className="size-2.5" />
            AI suggested {score}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="tabular flex h-8 w-10 items-center justify-end rounded-md border border-input bg-card px-2 text-sm font-semibold text-foreground shadow-card">
            {score}
          </span>
          <span className="tabular text-xs text-muted-foreground">/ {max}</span>
        </div>
      </div>
      {expanded ? (
        <div className="mt-3 space-y-2.5 pl-7.5">
          <p className="text-xs leading-5 text-muted-foreground">
            Uses two survey figures and explains how lost sleep hurts first-period learning.
          </p>
          <div className="rounded-md border-l-[3px] border-highlight-strong bg-highlight/35 px-2.5 py-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success-soft-foreground">
              <CircleCheck className="size-3" />
              Verified in paper
            </span>
            <q className="mt-1 block text-xs leading-5 text-foreground italic">{EVIDENCE}</q>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActionBar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 sm:px-6">
      {/* From lg up the floating QueueCard sits over this corner; start the copy to its right. */}
      <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex lg:pl-64 xl:pl-56">
        <ShieldCheck className="size-3.5 text-success" />
        Nothing publishes until you approve it.
      </p>
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
        {/* Phones hide criterion 3 (4 / 5), so the total covers only the two visible criteria. */}
        <span className="tabular mr-1 text-sm text-muted-foreground">
          <span className="sm:hidden">
            <span className="font-semibold text-foreground">13</span> / 15
          </span>
          <span className="hidden sm:inline">
            <span className="font-semibold text-foreground">17</span> / 20
          </span>
        </span>
        <div className="flex items-center gap-2">
          <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden sm:inline-flex")}>
            Send back
          </span>
          <span className={buttonVariants({ size: "sm" })}>
            <Check />
            Approve &amp; publish
          </span>
        </div>
      </div>
    </div>
  );
}

type QueueRow = {
  name: string;
  task: string;
  scanned: boolean;
  confidence: "High" | "Medium" | "Low";
  active?: boolean;
  flagged?: boolean;
};

/* Mirrors the review queue list: typed papers and camera-graded tests side by side. */
const QUEUE: QueueRow[] = [
  { name: "Rowan Thistlewood", task: "Persuasive Essay", scanned: false, confidence: "High", active: true },
  { name: "Iris Thistledown", task: "Unit 3 Quiz", scanned: true, confidence: "Medium" },
  { name: "Rafael Copperleaf", task: "Unit 3 Quiz", scanned: true, confidence: "Low", flagged: true },
];

const CONFIDENCE_BADGE: Record<QueueRow["confidence"], { badge: string; dot: string }> = {
  High: { badge: "bg-success-soft text-success-soft-foreground", dot: "bg-success" },
  Medium: { badge: "bg-warning-soft text-warning-soft-foreground", dot: "bg-warning" },
  Low: { badge: "bg-danger-soft text-danger-soft-foreground", dot: "bg-danger" },
};

function QueueCard() {
  return (
    <div className="absolute -bottom-14 -left-8 hidden w-72 rounded-xl border border-border bg-card p-2 shadow-raised lg:block xl:-left-14">
      <p className="px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground">3 waiting for your review</p>
      <ul className="space-y-0.5">
        {QUEUE.map((item, index) => {
          const SourceIcon = item.scanned ? Camera : FileText;
          const tone = CONFIDENCE_BADGE[item.confidence];
          return (
            <li
              key={item.name}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-1.5",
                item.active && "bg-accent ring-1 ring-border"
              )}
            >
              <span
                className={cn(
                  "tabular w-3 shrink-0 self-start pt-px text-right text-xs",
                  item.active ? "font-semibold text-primary" : "text-muted-foreground"
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-[13px] text-foreground",
                    item.active ? "font-semibold" : "font-medium"
                  )}
                >
                  {item.name}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <SourceIcon className="size-3 shrink-0" />
                  <span className="truncate">{item.task}</span>
                </span>
              </span>
              {item.flagged ? <Flag className="size-3.5 shrink-0 text-warning" /> : null}
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
                  tone.badge
                )}
              >
                <span className={cn("size-1.5 rounded-full", tone.dot)} />
                {item.confidence}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
