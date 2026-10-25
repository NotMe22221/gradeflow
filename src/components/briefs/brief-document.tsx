import { ListChecks, MessageCircleQuestion, MessagesSquare, ShieldCheck, Target, TrendingUp, type LucideIcon } from "lucide-react";

import type { BriefBasis, ConferenceBrief } from "@/lib/briefs/types";
import { formatBriefBasis } from "@/lib/briefs/text";
import { cn } from "@/lib/utils";

type Variant = "screen" | "print";

function Section({
  title,
  icon: Icon,
  iconClassName,
  items,
  numbered = false,
  variant,
}: {
  title: string;
  icon: LucideIcon;
  iconClassName?: string;
  items: string[];
  numbered?: boolean;
  variant: Variant;
}) {
  const print = variant === "print";
  const List = numbered ? "ol" : "ul";
  return (
    <section className="min-w-0 break-inside-avoid">
      <h4
        className={cn(
          "flex items-center gap-2 font-semibold text-foreground",
          print ? "text-[10.5pt]" : "text-sm"
        )}
      >
        <Icon className={cn(print ? "size-3.5" : "size-4", "shrink-0", iconClassName ?? "text-muted-foreground")} aria-hidden />
        {title}
      </h4>
      <List className={cn(print ? "mt-1.5 space-y-1" : "mt-2.5 space-y-2")}>
        {items.map((item, index) => (
          <li
            key={index}
            className={cn(
              "flex gap-2.5 text-pretty text-foreground/90",
              print ? "text-[9.5pt] leading-snug" : "text-sm leading-relaxed"
            )}
          >
            {numbered ? (
              <span aria-hidden className="tabular w-4 shrink-0 text-right font-medium text-muted-foreground">
                {index + 1}.
              </span>
            ) : (
              <span aria-hidden className="mt-[0.6em] size-1 shrink-0 rounded-full bg-muted-foreground/70" />
            )}
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </List>
    </section>
  );
}

/**
 * The one-page conference brief. The same component renders on screen and in
 * the print copy (variant "print": tighter type so it fits one page).
 */
export function BriefDocument({
  brief,
  basis,
  studentName,
  classTitle,
  dateLabel,
  engineNote,
  headingId,
  variant = "screen",
}: {
  brief: ConferenceBrief;
  basis: BriefBasis;
  studentName: string;
  classTitle: string;
  dateLabel: string;
  /** e.g. "AI draft · gpt-4o-mini" or "Demo brief"; printed in the footer. */
  engineNote: string;
  headingId?: string;
  variant?: Variant;
}) {
  const print = variant === "print";

  return (
    <article aria-labelledby={headingId} className={cn("text-foreground", print ? "space-y-4" : "space-y-6")}>
      <header className={cn("border-b border-border", print ? "space-y-1.5 pb-3" : "space-y-3 pb-5")}>
        <p
          className={cn(
            "font-medium tracking-wide text-muted-foreground uppercase",
            print ? "text-[8.5pt]" : "text-xs"
          )}
        >
          Parent-teacher conference brief
        </p>
        <h3
          id={headingId}
          tabIndex={-1}
          className={cn(
            "font-semibold tracking-tight text-balance outline-none",
            print ? "text-[15pt] leading-tight" : "text-xl leading-snug"
          )}
        >
          {brief.headline}
        </h3>
        <p className={cn("text-muted-foreground", print ? "text-[9.5pt]" : "text-sm")}>
          <span className="font-medium text-foreground">{studentName}</span> · {classTitle} · {dateLabel}
        </p>
        <p
          className={cn(
            "tabular inline-flex items-center gap-1.5 rounded-md bg-secondary font-medium text-secondary-foreground",
            print ? "px-1.5 py-0.5 text-[8.5pt]" : "px-2 py-1 text-xs"
          )}
        >
          <ShieldCheck className="size-3.5 shrink-0 text-success" aria-hidden />
          {formatBriefBasis(basis)}
        </p>
      </header>

      <p className={cn("text-pretty", print ? "text-[10pt] leading-snug" : "text-[15px] leading-relaxed")}>
        {brief.summary}
      </p>

      <div className={cn("grid", print ? "grid-cols-2 gap-5" : "gap-6 sm:grid-cols-2")}>
        <Section title="Strengths" icon={TrendingUp} iconClassName="text-success" items={brief.strengths} variant={variant} />
        <Section title="Growth areas" icon={Target} iconClassName="text-warning" items={brief.growthAreas} variant={variant} />
      </div>

      <Section title="Talking points" icon={MessagesSquare} items={brief.talkingPoints} numbered variant={variant} />

      <div className={cn("grid", print ? "grid-cols-2 gap-5" : "gap-6 sm:grid-cols-2")}>
        <Section title="Next steps" icon={ListChecks} items={brief.nextSteps} variant={variant} />
        <Section
          title="Questions for the family"
          icon={MessageCircleQuestion}
          items={brief.questionsForFamily}
          variant={variant}
        />
      </div>

      {print ? (
        <footer className="flex items-end justify-between gap-6 border-t border-border pt-3 text-[8.5pt] text-muted-foreground">
          <p>{engineNote} · Drafted from teacher-approved grades only.</p>
          <p className="shrink-0">Reviewed by: ______________</p>
        </footer>
      ) : null}
    </article>
  );
}
