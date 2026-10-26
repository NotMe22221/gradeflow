import Link from "next/link";

import { Camera, ChartColumn, ChevronRight, FileText, type IconComponent } from "@/components/icons";
import { BriefStudentPicker } from "@/components/dashboard/brief-student-picker";
import type { BriefPickerClass } from "@/lib/insights/brief-picker";
import { cn } from "@/lib/utils";

function Tool({
  icon: Icon,
  title,
  description,
  href,
  children,
  className,
}: {
  icon: IconComponent;
  title: string;
  description: string;
  /** Makes the whole cell a link (via the stretched title link). */
  href?: string;
  /** Controls for a cell that is not a link (the brief picker). */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "relative flex min-w-0 flex-col gap-3 bg-card p-4 @min-[36rem]:p-5",
        href && "transition-colors hover:bg-primary/[0.04] has-[a:focus-visible]:bg-primary/[0.04]",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-sans text-[0.9375rem] leading-6 font-medium text-foreground">
            {href ? (
              <Link
                href={href}
                className="rounded-sm outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </h3>
          <p className="mt-0.5 text-[0.875rem] leading-5 text-pretty text-muted-foreground">{description}</p>
        </div>
        {href ? <ChevronRight className="mt-2 size-5 shrink-0 text-muted-foreground" aria-hidden /> : null}
      </div>
      {children ? <div className="mt-auto @min-[36rem]:pl-14">{children}</div> : null}
    </li>
  );
}

/**
 * The Paper Scanner, the class heatmap, and conference briefs (pick a
 * student; their profile drafts the brief in one click), as one quiet card.
 * Its cells sit side by side as the section gets wider, whichever column it
 * is in.
 */
export function TeachingTools({ briefClasses, className }: { briefClasses: BriefPickerClass[]; className?: string }) {
  return (
    // gap-px over a border-colored background draws the dividers in any arrangement.
    <ul
      className={cn(
        "grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border @min-[36rem]:grid-cols-2 @min-[58rem]:grid-cols-3",
        className
      )}
    >
      <Tool
        icon={Camera}
        title="Paper Scanner"
        description="Photograph a handwritten test and its answer key. You get draft scores to check."
        href="/scan"
      />
      <Tool
        icon={ChartColumn}
        title="Class heatmap"
        description="See which questions and rubric criteria each class misses most."
        href="/insights"
      />
      <Tool
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
