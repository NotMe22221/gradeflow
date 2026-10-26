import {
  ChartColumn,
  Camera,
  Check,
  ClipboardCheck,
  FlaskConical,
  House,
  Menu,
  MoreVertical,
  ShieldCheck,
  Sparkles,
  Table2,
  type LucideIcon,
} from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { BannerArt } from "@/components/classroom/banner-art";
import { buttonVariants } from "@/components/ui/button";
import { bannerMotif, classTheme } from "@/lib/ui/class-theme";
import { cn } from "@/lib/utils";

/*
 * A static, non-interactive preview of the product, built from the same
 * tokens and pieces as the real screens: the app bar and class drawer, class
 * cards with their colored banners, and the grading panel with Approve &
 * return. Everything inside is decorative (aria-hidden); the figure carries a
 * text description for screen readers. Names and text are synthetic.
 */

const EVIDENCE = "students average only 6.6 hours of sleep on school nights";

type MockClass = { name: string; section: string; due: string; work: string; review: string };

const CLASSES: MockClass[] = [
  { name: "English 10", section: "Period 2", due: "Due Friday", work: "Persuasive Essay", review: "3 to review" },
  {
    name: "Environmental Science",
    section: "Period 4",
    due: "Due today",
    work: "Unit 3 Quiz (handwritten)",
    review: "2 scans to review",
  },
];

export function HeroMock({ className }: { className?: string }) {
  return (
    <figure
      role="img"
      aria-label="Preview of GradeSmart AI: a class home with color-coded class cards that show upcoming work and how many papers wait for review, beside the grading panel. The panel shows a student paper with a highlighted evidence quote, rubric scores the AI drafted, a high confidence badge, and the Approve and return button the teacher must press before the grade reaches the student."
      className={cn("relative mx-auto w-full max-w-6xl", className)}
    >
      <div aria-hidden className="pointer-events-none rounded-[28px] bg-secondary p-1.5 select-none sm:p-2.5">
        <div className="overflow-hidden rounded-[22px] border border-border bg-card">
          <AppBar />
          <div className="flex">
            <Drawer />
            <div className="min-w-0 flex-1 bg-background p-3 sm:p-5 lg:p-6">
              <div className="grid gap-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.25fr)] lg:gap-5 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
                <div className="order-2 flex min-w-0 flex-col gap-4 md:order-1">
                  {CLASSES.map((klass, index) => (
                    <ClassCard key={klass.name} klass={klass} className={index > 0 ? "hidden sm:flex" : undefined} />
                  ))}
                </div>
                <GradingPanel className="order-1 md:order-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

function AppBar() {
  return (
    <div className="flex h-14 items-center gap-2 border-b border-border px-3 sm:gap-3 sm:px-4">
      <span className="flex size-9 items-center justify-center rounded-full text-muted-foreground">
        <Menu className="size-5" />
      </span>
      <LogoMark className="size-7" />
      <span className="font-display text-[17px] font-semibold tracking-[-0.01em] text-foreground">
        GradeSmart <span className="font-normal text-muted-foreground">AI</span>
      </span>
      <span className="ml-auto hidden h-7 items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 text-xs font-medium text-muted-foreground sm:inline-flex">
        <FlaskConical className="size-3.5" />
        Demo engines
      </span>
      <span className="ml-auto flex size-8 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground ring-1 ring-border sm:ml-0">
        MH
      </span>
    </div>
  );
}

const NAV: { icon: LucideIcon; label: string; active?: boolean; count?: number }[] = [
  { icon: House, label: "Home" },
  { icon: ClipboardCheck, label: "To review", active: true, count: 5 },
  { icon: Camera, label: "Paper Scanner" },
  { icon: Table2, label: "Gradebook" },
  { icon: ChartColumn, label: "Insights" },
];

function Drawer() {
  return (
    <div className="hidden w-52 shrink-0 flex-col gap-0.5 border-r border-border bg-background px-2.5 py-3 xl:flex">
      {NAV.map((item) => (
        <span
          key={item.label}
          className={cn(
            "flex h-10 items-center gap-3 rounded-full px-3.5 text-[13px] font-medium",
            item.active ? "bg-primary-soft text-primary-soft-foreground" : "text-sidebar-foreground"
          )}
        >
          <item.icon className="size-[18px] shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          {item.count ? <span className="tabular text-xs font-semibold">{item.count}</span> : null}
        </span>
      ))}
      <span className="my-2 h-px bg-border" />
      <span className="px-3.5 pb-1 text-xs font-medium text-muted-foreground">Teaching</span>
      {CLASSES.map((klass) => (
        <span key={klass.name} className="flex h-12 items-center gap-3 rounded-full px-3 text-[13px] font-medium text-sidebar-foreground">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs text-white"
            style={{ backgroundColor: classTheme(klass).color }}
          >
            {klass.name.charAt(0)}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate">{klass.name}</span>
            <span className="block truncate text-[11px] font-normal text-muted-foreground">{klass.section}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

function ClassCard({ klass, className }: { klass: MockClass; className?: string }) {
  const theme = classTheme(klass);
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="relative isolate h-[88px] overflow-hidden px-4 pt-3.5 text-white" style={{ backgroundColor: theme.color }}>
        <BannerArt
          motif={bannerMotif(klass)}
          className="pointer-events-none absolute -right-6 -bottom-4 -z-10 h-[104px] w-auto text-white opacity-80"
        />
        <p className="truncate font-display text-lg leading-6 font-medium">{klass.name}</p>
        <p className="truncate text-[13px] text-white/90">{klass.section}</p>
      </div>
      <div className="space-y-0.5 px-4 pt-3 pb-3.5">
        <p className="text-xs text-muted-foreground">{klass.due}</p>
        <p className="truncate text-[13px] font-medium text-foreground">{klass.work}</p>
      </div>
      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <span className="tabular inline-flex h-7 items-center gap-1.5 rounded-full bg-primary-soft px-2.5 text-xs font-medium text-primary-soft-foreground">
          <ClipboardCheck className="size-3.5" />
          {klass.review}
        </span>
        <span className="flex size-8 items-center justify-center rounded-full text-muted-foreground">
          <MoreVertical className="size-4" />
        </span>
      </div>
    </div>
  );
}

const CRITERIA = [
  { title: "Thesis and position", score: 5, max: 5 },
  { title: "Evidence and reasoning", score: 8, max: 10, open: true },
  { title: "Counterargument", score: 4, max: 5 },
];

function GradingPanel({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground ring-1 ring-border">
          RT
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">Rowan Thistlewood</span>
          <span className="block truncate text-xs text-muted-foreground">Persuasive Essay · Turned in</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success-soft-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          <span className="hidden sm:inline">High confidence</span>
          <span className="sm:hidden">High</span>
        </span>
      </div>

      <div className="grid min-w-0 flex-1 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <div className="border-b border-border bg-background/60 px-4 py-4 text-[13px] leading-6 text-foreground/90 lg:border-r lg:border-b-0">
          <p>
            The strongest reason for the change is sleep. According to the Cedar Ridge sleep survey,{" "}
            <mark className="rounded-sm bg-highlight box-decoration-clone px-0.5 text-foreground">{EVIDENCE}</mark>.
          </p>
          <p className="mt-3 hidden text-foreground/45 sm:block">
            That extra hour would show up in our classrooms, too.
          </p>
        </div>

        <div className="space-y-2 px-3 py-3 sm:px-3.5 sm:py-4">
          <p className="flex items-center justify-between px-1 pb-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Rubric</span>
            <span className="inline-flex items-center gap-1">
              <Sparkles className="size-3" />
              AI draft
            </span>
          </p>
          {CRITERIA.map((criterion, index) => (
            <div
              key={criterion.title}
              className={cn(
                "rounded-lg border border-border px-2.5 py-2.5",
                criterion.open && "border-primary/40 bg-primary/[0.03]",
                index === 2 && "hidden sm:block"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{criterion.title}</span>
                <span className="tabular flex h-7 w-9 items-center justify-center rounded-md border border-input/60 bg-card text-[13px] font-semibold text-foreground">
                  {criterion.score}
                </span>
                <span className="tabular w-6 text-xs text-muted-foreground">/ {criterion.max}</span>
              </div>
              {criterion.open ? (
                <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-4 text-success-soft-foreground">
                  <Check className="mt-px size-3 shrink-0" />
                  Quote found in the paper
                </p>
              ) : null}
            </div>
          ))}
          <p className="hidden items-start gap-1.5 px-1 pt-1 text-[11px] leading-4 text-muted-foreground sm:flex">
            <ShieldCheck className="size-3.5 shrink-0 text-success" />
            Nothing reaches the student until you approve it.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
        <span className="tabular mr-auto text-sm text-muted-foreground">
          {/* Phones hide criterion 3 (4 / 5), so the total covers only the two visible criteria. */}
          <span className="sm:hidden">
            <span className="font-semibold text-foreground">13</span> / 15
          </span>
          <span className="hidden sm:inline">
            <span className="font-semibold text-foreground">17</span> / 20
          </span>
        </span>
        <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden sm:inline-flex")}>Send back</span>
        <span className={buttonVariants({ size: "sm" })}>
          <Check />
          Approve &amp; return
        </span>
      </div>
    </div>
  );
}
