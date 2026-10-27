import Link from "next/link";

import { Camera, ChartColumn, ChevronRight, FileText, type IconComponent } from "@/components/icons";
import { BriefStudentPicker } from "@/components/dashboard/brief-student-picker";
import type { BriefPickerClass } from "@/lib/insights/brief-picker";
import { cn } from "@/lib/utils";

/**
 * Each tool's icon sits on a paint-shaped tile in a band color (plain tonal in
 * the Calm look), so the three read apart at a glance.
 */
const TOOL_TONES = {
  coral: "bg-band-coral rounded-[58%_42%_55%_45%/48%_56%_44%_52%]",
  yellow: "bg-band-yellow rounded-[44%_56%_46%_54%/56%_44%_56%_44%]",
  pink: "bg-band-pink rounded-[52%_48%_38%_62%/45%_60%_40%_55%]",
} as const;

function Tool({
  icon: Icon,
  title,
  description,
  href,
  tone,
  children,
  className,
}: {
  icon: IconComponent;
  title: string;
  description: string;
  /** Makes the whole cell a link (via the stretched title link). */
  href?: string;
  tone: keyof typeof TOOL_TONES;
  /** Controls for a cell that is not a link (the brief picker). */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "relative flex min-w-0 flex-col gap-4 rounded-3xl border border-border bg-card p-5",
        href &&
          "transition-[box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:shadow-hover has-[a:focus-visible]:shadow-hover motion-reduce:hover:translate-y-0",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center text-band-foreground",
            TOOL_TONES[tone]
          )}
        >
          <Icon className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="font-display text-[1.0625rem] leading-6 font-extrabold tracking-[-0.01em] text-foreground">
            {href ? (
              <Link
                href={href}
                className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </h3>
          <p className="mt-0.5 text-[0.875rem] leading-5 text-pretty text-muted-foreground">{description}</p>
        </div>
        {href ? <ChevronRight className="mt-3 size-5 shrink-0 text-muted-foreground" aria-hidden /> : null}
      </div>
      {children ? <div className="mt-auto @min-[36rem]:pl-16">{children}</div> : null}
    </li>
  );
}

/**
 * The Paper Scanner, the class heatmap, and conference briefs (pick a
 * student; their profile drafts the brief in one click), as three cards with
 * bright icon tiles. They sit side by side as the section gets wider,
 * whichever column it is in.
 */
export function TeachingTools({ briefClasses, className }: { briefClasses: BriefPickerClass[]; className?: string }) {
  return (
    <ul className={cn("grid grid-cols-1 gap-3 @min-[36rem]:grid-cols-2 @min-[58rem]:grid-cols-3", className)}>
      <Tool
        tone="coral"
        icon={Camera}
        title="Paper Scanner"
        description="Photograph a handwritten test and its answer key. You get draft scores to check."
        href="/scan"
      />
      <Tool
        tone="yellow"
        icon={ChartColumn}
        title="Class heatmap"
        description="See which questions and rubric criteria each class misses most."
        href="/insights"
      />
      <Tool
        tone="pink"
        icon={FileText}
        title="Conference briefs"
        description="A one-page summary of a student's approved grades, for a family conference."
        className="@min-[36rem]:col-span-2 @min-[58rem]:col-span-1"
      >
        {briefClasses.length > 0 ? (
          <BriefStudentPicker classes={briefClasses} />
        ) : (
          <p className="flex min-h-10 items-center text-[0.875rem] text-muted-foreground">
            Approve a grade to draft the first brief.
          </p>
        )}
      </Tool>
    </ul>
  );
}
