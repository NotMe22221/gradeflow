import { Fragment } from "react";
import {
  Camera,
  Crosshair,
  Download,
  FileText,
  Flag,
  Flame,
  ImageIcon,
  MessagesSquare,
  Plus,
  ScrollText,
  ShieldCheck,
  PenLine,
  Sprout,
  Table2,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  type IconComponent,
} from "@/components/icons";

import { AssignmentIcon } from "@/components/classwork/assignment-icon";
import { HEAT_TONE } from "@/components/insights/heat-tone";
import { WORK_TONE_CLASS, type WorkTone } from "@/components/student/todo-model";
import { heatBand } from "@/lib/insights/heatmap";
import { classTheme } from "@/lib/ui/class-theme";
import { cn } from "@/lib/utils";

/*
 * Small, static product previews for the landing page's feature cards. They
 * reuse the real screens' tokens and patterns (tabs, badges, heat tones, the
 * XP bar) so they read as the product. All of them are decorative: the card
 * that holds one hides it from assistive tech and describes the feature in
 * text. Names and numbers are synthetic and illustrative.
 */

/** The review screen's "Transcription | Photo" toggle, in miniature. */
export function MiniPaperTabs({ active, className }: { active: "transcription" | "photo"; className?: string }) {
  const tab = "inline-flex h-full items-center gap-1 rounded-full px-2.5 [&>svg]:size-3 [&>svg]:shrink-0";
  const on = "bg-card text-primary-soft-foreground shadow-hover";
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full bg-secondary p-0.5 text-[0.6875rem] font-medium text-muted-foreground",
        className
      )}
    >
      <span className={cn(tab, active === "transcription" && on)}>
        <ScrollText />
        Transcription
      </span>
      <span className={cn(tab, active === "photo" && on)}>
        <ImageIcon />
        <span className="tabular">Photo (1)</span>
      </span>
    </span>
  );
}

function PreviewFootnote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-[0.6875rem] leading-4 text-muted-foreground">
      <ShieldCheck className="size-3.5 shrink-0 text-success" />
      <span>{children}</span>
    </p>
  );
}

function Initials({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.625rem] font-semibold text-secondary-foreground ring-1 ring-border",
        className
      )}
    >
      {children}
    </span>
  );
}

/* --- Teacher: camera grader ------------------------------------------------ */

const PHOTO_ANSWERS = [
  "1. Land that drains into the same river",
  "2. Fertilizer runoff and road salt",
  "3. Fish breathe it through their gills",
  "4. The water got more basic",
  "5. Plant a buffer strip of trees",
];

const READ_SCORES = [
  { q: "Q1", topic: "Watershed", score: 2, max: 2 },
  { q: "Q2", topic: "Pollutants", score: 2, max: 2 },
  { q: "Q3", topic: "Oxygen", score: 2, max: 2 },
  { q: "Q4", topic: "pH change", score: 0, max: 2 },
  { q: "Q5", topic: "Buffer strip", score: 2, max: 2 },
];

export function CameraPreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <MiniPaperTabs active="photo" />
        <span className="truncate text-[0.6875rem] text-muted-foreground">Iris T. · Unit 3 Quiz</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-3">
        {/* The photo: a ruled page on a desk, slightly askew. */}
        <div className="flex items-center justify-center rounded-lg bg-muted px-2.5 py-3 ring-1 ring-border ring-inset">
          <div className="w-full -rotate-2 rounded-[3px] bg-card px-2.5 pt-2 pb-1.5 shadow-raised ring-1 ring-black/5">
            <div className="flex items-baseline justify-between gap-2 border-b border-foreground/20 pb-1">
              <span className="truncate text-[0.5625rem] font-semibold tracking-wide text-foreground/70 uppercase">
                Unit 3 Quiz
              </span>
              <span className="shrink-0 text-[0.5625rem] text-foreground/70 italic">Iris T.</span>
            </div>
            <ol>
              {PHOTO_ANSWERS.map((line) => (
                <li
                  key={line}
                  className="line-clamp-2 border-b border-border py-[3px] text-[0.5625rem] leading-[1.35] tracking-tight text-foreground/80 italic last:border-b-0"
                >
                  {line}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {READ_SCORES.map((row) => (
            <li key={row.q} className="flex items-center gap-2 px-2.5 py-[7px] text-[0.6875rem]">
              <span className="tabular w-5 shrink-0 font-semibold text-foreground">{row.q}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{row.topic}</span>
              <span
                className={cn(
                  "tabular shrink-0 font-semibold",
                  row.score === 0 ? "text-danger-soft-foreground" : "text-foreground"
                )}
              >
                {row.score}
                <span className="font-normal text-muted-foreground">/{row.max}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <PreviewFootnote>Sent to To review. Nothing reaches the student yet.</PreviewFootnote>
    </div>
  );
}

/* --- Teacher: conference brief --------------------------------------------- */

function BriefSection({
  icon: Icon,
  iconClassName,
  title,
  items,
  numbered = false,
}: {
  icon: IconComponent;
  iconClassName: string;
  title: string;
  items: string[];
  numbered?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-foreground">
        <Icon className={cn("size-3.5 shrink-0", iconClassName)} />
        {title}
      </p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item, index) => (
          <li key={item} className="flex gap-2 text-[0.6875rem] leading-4 text-foreground/80">
            {numbered ? (
              <span className="tabular w-3 shrink-0 text-right font-medium text-muted-foreground">{index + 1}.</span>
            ) : (
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground/70" />
            )}
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BriefPreview() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-medium text-muted-foreground">Conference brief</p>
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">Iris Thistledown</p>
          <p className="tabular truncate text-[0.6875rem] text-muted-foreground">
            Environmental Science · 4 approved grades
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[0.6875rem] font-medium text-primary-soft-foreground">
          <PenLine className="size-3" />
          AI draft
        </span>
      </div>
      <div className="mt-3 grid gap-3 @sm:grid-cols-2">
        <BriefSection
          icon={TrendingUp}
          iconClassName="text-success"
          title="Strengths"
          items={["Precise answers backed by evidence", "Careful, complete lab write-ups"]}
        />
        <BriefSection
          icon={Sprout}
          iconClassName="text-warning"
          title="Growth areas"
          items={["Explaining how pH changes", "Showing work on data questions"]}
        />
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <BriefSection
          icon={MessagesSquare}
          iconClassName="text-muted-foreground"
          title="Talking points"
          numbered
          items={["Celebrate the 92% on the Willow Creek lab", "Plan a short pH review before Unit 4"]}
        />
      </div>
    </div>
  );
}

/* --- Teacher: class heatmap ------------------------------------------------ */

const HEAT_QUESTIONS = ["Q1", "Q2", "Q3", "Q4", "Q5"];
const MISSED_INDEX = 3;

const HEAT_ROWS = [
  { name: "Ava Q.", cells: [100, 75, 100, 50, 100] },
  { name: "Iris T.", cells: [100, 100, 100, 25, 100] },
  { name: "Milo B.", cells: [75, 100, 50, 0, 75] },
  { name: "Rafael C.", cells: [50, 25, 50, 50, 25] },
  { name: "Theo M.", cells: [100, 75, 75, 25, 100] },
];

const HEAT_AVERAGES = HEAT_QUESTIONS.map((_, column) =>
  Math.round(HEAT_ROWS.reduce((sum, row) => sum + (row.cells[column] ?? 0), 0) / HEAT_ROWS.length)
);

export function HeatmapPreview() {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2 px-0.5 pb-2.5">
        <p className="truncate text-[0.6875rem] font-semibold text-foreground">Unit 3 Quiz · Points earned</p>
        <span className="tabular shrink-0 text-[0.6875rem] text-muted-foreground">Approved grades</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1.3fr)_repeat(5,minmax(0,1fr))] gap-1">
        <span />
        {HEAT_QUESTIONS.map((q, index) => (
          <span
            key={q}
            className={cn(
              "tabular pb-0.5 text-center text-[0.625rem] font-medium text-muted-foreground",
              index === MISSED_INDEX && "font-semibold text-danger-soft-foreground"
            )}
          >
            {q}
          </span>
        ))}
        {HEAT_ROWS.map((row) => (
          <Fragment key={row.name}>
            <span className="self-center truncate pr-1 text-[0.6875rem] font-medium text-foreground">{row.name}</span>
            {row.cells.map((value, index) => (
              <span
                key={index}
                className={cn(
                  "tabular flex h-6 items-center justify-center rounded-[5px] text-[0.625rem] font-medium",
                  HEAT_TONE[heatBand(value)].cell,
                  index === MISSED_INDEX && "ring-1 ring-danger/35 ring-inset"
                )}
              >
                {value}%
              </span>
            ))}
          </Fragment>
        ))}
        <span className="self-center pt-1 text-[0.625rem] text-muted-foreground">Average</span>
        {HEAT_AVERAGES.map((value, index) => (
          <span
            key={index}
            className={cn("tabular pt-1 text-center text-[0.625rem] font-semibold", HEAT_TONE[heatBand(value)].text)}
          >
            {value}%
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-md border border-danger/20 bg-danger-soft/60 px-2.5 py-2 text-[0.6875rem]">
        <Crosshair className="size-3.5 shrink-0 text-danger-soft-foreground" />
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">Most missed: Q4, pH change</span>
        <span className="tabular shrink-0 font-semibold text-danger-soft-foreground">
          {HEAT_AVERAGES[MISSED_INDEX]}% avg
        </span>
      </div>
    </div>
  );
}

/* --- Teacher: review queue and gradebook ----------------------------------- */

const QUEUE_ROWS = [
  { initials: "AQ", name: "Ava Quillon", task: "Persuasive Essay", scanned: false, dot: "bg-success", label: "High", flagged: false },
  { initials: "IT", name: "Iris Thistledown", task: "Unit 3 Quiz", scanned: true, dot: "bg-warning", label: "Medium", flagged: false },
  { initials: "RC", name: "Rafael Copperleaf", task: "Unit 3 Quiz", scanned: true, dot: "bg-danger", label: "Low", flagged: true },
];

export function QueuePreview() {
  return (
    <div className="space-y-2.5">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <p className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-[0.6875rem]">
          <span className="font-semibold text-foreground">To review</span>
          <span className="tabular text-muted-foreground">3 waiting for you</span>
        </p>
        <ul className="divide-y divide-border">
          {QUEUE_ROWS.map((row, index) => {
            const SourceIcon = row.scanned ? Camera : FileText;
            return (
              <li key={row.name} className={cn("flex items-center gap-2.5 px-3 py-2", index === 0 && "bg-accent/70")}>
                <Initials className={index === 0 ? "bg-card" : undefined}>{row.initials}</Initials>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">{row.name}</span>
                  <span className="flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
                    <SourceIcon className="size-3 shrink-0" />
                    <span className="truncate">{row.task}</span>
                  </span>
                </span>
                {row.flagged ? <Flag className="size-3 shrink-0 text-warning" /> : null}
                <span className="inline-flex shrink-0 items-center gap-1 text-[0.6875rem] text-muted-foreground">
                  <span className={cn("size-1.5 rounded-full", row.dot)} />
                  {row.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <Table2 className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-[0.6875rem] font-semibold text-foreground">Gradebook</span>
        <span className="tabular inline-flex items-center gap-1 rounded-full bg-success-soft px-1.5 py-px text-[0.625rem] font-medium text-success-soft-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          18 published
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-input/60 bg-card px-2.5 py-0.5 text-[0.6875rem] font-medium text-primary">
          <Download className="size-3" />
          CSV
        </span>
      </div>
    </div>
  );
}

/* --- Student: goal planner ------------------------------------------------- */

const GOAL_TASKS = [
  { title: "Unit 4 Quiz", needed: 17, max: 20 },
  { title: "Stream Survey Lab", needed: 46, max: 50 },
];

export function GoalPreview() {
  return (
    <div className="space-y-2.5">
      <div className="flex h-10 items-center gap-2 rounded-lg border border-input/60 bg-card px-3">
        <Target className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs text-foreground">I need an A in Environmental Science</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <span className="truncate text-[0.6875rem] font-semibold text-foreground">Aim for 90% overall</span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[0.6875rem] font-medium text-success-soft-foreground">
            <TrendingUp className="size-3" />
            On track
          </span>
        </div>
        <ul className="divide-y divide-border">
          {GOAL_TASKS.map((task) => (
            <li key={task.title} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{task.title}</span>
              <span className="tabular shrink-0 text-right text-xs font-semibold text-foreground">
                {task.needed}
                <span className="font-normal text-muted-foreground"> / {task.max}</span>
              </span>
              <span className="tabular w-8 shrink-0 text-right text-[0.6875rem] text-muted-foreground">
                {Math.round((task.needed / task.max) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
      <PreviewFootnote>Calculated from your teacher-approved grades.</PreviewFootnote>
    </div>
  );
}

/* --- Student: streaks and XP ----------------------------------------------- */

const XP_EVENTS = [
  { xp: 50, label: "Submitted a paper" },
  { xp: 15, label: "Study session" },
  { xp: 10, label: "Set a goal" },
];

export function StreakPreview() {
  return (
    <div className="space-y-2.5">
      <div className="grid gap-2 @sm:grid-cols-2">
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning-soft-foreground ring-1 ring-warning/30">
            <Flame className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="tabular block text-[0.8125rem] font-semibold text-foreground">6-day streak</span>
            <span className="block text-[0.6875rem] font-medium text-success-soft-foreground">Active today</span>
          </span>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground ring-1 ring-primary/15">
            <Trophy className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="tabular block text-[0.8125rem] font-semibold text-foreground">Level 3</span>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted ring-1 ring-border/60 ring-inset">
              <span className="block h-full w-[64%] rounded-full bg-primary" />
            </span>
            <span className="tabular mt-1 block truncate text-[0.625rem] text-muted-foreground">160 / 250 XP to Level 4</span>
          </span>
        </div>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {XP_EVENTS.map((event) => (
          <li
            key={event.label}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[0.6875rem]"
          >
            <span className="tabular font-semibold text-foreground">+{event.xp}</span>
            <span className="text-muted-foreground">{event.label}</span>
          </li>
        ))}
      </ul>
      <PreviewFootnote>XP tracks effort. It never changes a grade.</PreviewFootnote>
    </div>
  );
}

/* --- Student: assignment inbox --------------------------------------------- */

type InboxPreviewRow = {
  title: string;
  /** Picks the icon circle's class color, as classTheme() does in the real inbox. */
  className: string;
  /** Relative due text, as the inbox and To-do show it. */
  due: string;
  isTest: boolean;
  /** workStatus() wording and tone for this row. */
  status: string;
  tone: WorkTone;
  active?: boolean;
};

// The Assigned tab, sorted as the real inbox sorts it: work sent back first,
// then by due date. A paper test reads "Paper test": the student takes it in
// class and the teacher scans it, so there is nothing to upload.
const INBOX_ROWS: InboxPreviewRow[] = [
  {
    title: "Lab Report",
    className: "Environmental Science",
    due: "Due Thursday",
    isTest: false,
    status: "Sent back",
    tone: "attention",
  },
  {
    title: "Persuasive Essay",
    className: "English 10",
    due: "Due Friday",
    isTest: false,
    status: "Assigned",
    tone: "assigned",
    active: true,
  },
  {
    title: "Unit 4 Quiz",
    className: "Environmental Science",
    due: "Test on Friday",
    isTest: true,
    status: "Paper test",
    tone: "neutral",
  },
];

const INBOX_TABS = [
  { label: "Assigned", count: INBOX_ROWS.length, active: true },
  { label: "Missing", count: 0, active: false },
  { label: "Done", count: 2, active: false },
];

// The quick actions the real inbox offers for an essay that hasn't been turned in.
const INBOX_ACTIONS: { icon: IconComponent; label: string; primary?: boolean }[] = [
  { icon: Plus, label: "Add your work", primary: true },
  { icon: Target, label: "Plan my grade" },
  { icon: Timer, label: "Log a study session" },
];

export function InboxPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Assigned / Missing / Done with counts, like the real underline tabs. */}
      <div className="flex gap-0.5 border-b border-border px-1.5">
        {INBOX_TABS.map((tab) => (
          <span
            key={tab.label}
            className={cn(
              "relative inline-flex h-8 items-center gap-1 px-2 text-[0.6875rem] font-medium whitespace-nowrap",
              tab.active ? "text-primary" : "text-muted-foreground"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "tabular min-w-4 rounded-full px-1 text-center text-[0.5625rem] leading-[0.875rem] font-semibold",
                tab.active ? "bg-primary-soft text-primary-soft-foreground" : "bg-secondary text-muted-foreground"
              )}
            >
              {tab.count}
            </span>
            {tab.active ? <span className="absolute inset-x-1.5 bottom-0 h-0.5 rounded-t-full bg-primary" /> : null}
          </span>
        ))}
      </div>
      <ul className="divide-y divide-border">
        {INBOX_ROWS.map((row) => (
          <li
            key={row.title}
            className={cn("flex items-center gap-2.5 px-3 py-2", row.active && "bg-primary-soft/45")}
          >
            <AssignmentIcon
              isTest={row.isTest}
              color={classTheme({ name: row.className }).color}
              className="size-6 [&_svg]:size-3.5"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-foreground">{row.title}</span>
              <span className="block truncate text-[0.625rem] text-muted-foreground">{row.due}</span>
            </span>
            <span className={cn("shrink-0 text-[0.625rem] font-medium", WORK_TONE_CLASS[row.tone])}>{row.status}</span>
          </li>
        ))}
      </ul>
      {/* Quick actions for the selected row, laid out like the real panel. */}
      <div className="grid grid-cols-2 gap-1.5 border-t border-border p-2">
        {INBOX_ACTIONS.map((action) => (
          <span
            key={action.label}
            className={cn(
              "inline-flex h-7 min-w-0 items-center justify-center gap-1 rounded-full px-2.5 text-[0.6875rem] font-medium",
              action.primary
                ? "col-span-2 bg-primary text-primary-foreground"
                : "border border-input/60 bg-card text-primary"
            )}
          >
            <action.icon className="size-3 shrink-0" />
            <span className="truncate">{action.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
