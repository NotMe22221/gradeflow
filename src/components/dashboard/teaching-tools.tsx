import Link from "next/link";
import { Camera, ChartColumn, ChevronRight, FileText, type IconComponent } from "@/components/icons";

import { BriefStudentPicker } from "@/components/dashboard/brief-student-picker";
import { SectionHeader } from "@/components/dashboard/section-header";
import type { BriefPickerClass } from "@/lib/insights/brief-picker";
import { cn } from "@/lib/utils";

function ToolCard({
  icon: Icon,
  title,
  description,
  href,
  cta,
  children,
  className,
}: {
  icon: IconComponent;
  title: string;
  description: string;
  /** Makes the whole card a link (via the stretched title link). */
  href?: string;
  /** Visible call to action under a linked card. */
  cta?: string;
  /** Controls for a card that is not a link (the brief picker). */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "relative flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-shadow sm:p-5",
        href && "hover:shadow-hover",
        className
      )}
    >
      <div className={cn("flex items-start gap-4", cta && "max-sm:items-center")}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base leading-6 font-medium text-foreground">
            {href ? (
              <Link
                href={href}
                className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:after:ring-[3px] focus-visible:after:ring-ring"
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </h3>
          <p className="mt-0.5 text-sm text-pretty text-muted-foreground max-sm:text-[0.8125rem]">{description}</p>
        </div>
        {/* Phones: a chevron instead of the call-to-action line. */}
        {cta ? <ChevronRight className="size-5 shrink-0 text-muted-foreground sm:hidden" aria-hidden /> : null}
      </div>
      {/* mt-auto lines the actions up along the bottom of the row. */}
      <div className={cn("mt-auto", cta ? "pl-14 max-sm:hidden" : "sm:max-xl:max-w-lg sm:max-xl:pl-14")}>
        {cta ? (
          <span className="inline-flex h-8 items-center gap-1 text-sm font-medium text-primary" aria-hidden>
            {cta}
            <ChevronRight className="size-4" />
          </span>
        ) : (
          children
        )}
      </div>
    </li>
  );
}

/**
 * The three AI teaching tools from the Teacher Dashboard brief: the Paper
 * Scanner, the class heatmap, and conference briefs (pick a student, then one
 * click on their profile drafts the brief). Tool cards in a row on wide
 * screens; they stack on phones.
 */
export function TeachingTools({ briefClasses, className }: { briefClasses: BriefPickerClass[]; className?: string }) {
  return (
    <section aria-labelledby="teaching-tools-heading" className={className}>
      <SectionHeader id="teaching-tools-heading" title="Teaching tools" />
      {/* Two up with the briefs card full width below, until there is room for three in a row. */}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ToolCard
          icon={Camera}
          title="Paper Scanner"
          description="Snap a handwritten test and its answer key. AI drafts the scores for your review."
          href="/scan"
          cta="Scan a test"
        />
        <ToolCard
          icon={ChartColumn}
          title="Class heatmap"
          description="See which questions and rubric criteria each class misses most."
          href="/insights"
          cta="Open heatmap"
        />
        <ToolCard
          icon={FileText}
          title="Conference briefs"
          description="A one-page summary of a student's approved grades for a family conference."
          className="sm:col-span-2 xl:col-span-1"
        >
          {briefClasses.length > 0 ? (
            <BriefStudentPicker classes={briefClasses} />
          ) : (
            <p className="flex min-h-8 items-center text-sm text-muted-foreground">
              Approve a grade to draft the first brief.
            </p>
          )}
        </ToolCard>
      </ul>
    </section>
  );
}
