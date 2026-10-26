import Link from "next/link";
import { ClipboardCheck, FolderOpen, Table2, type LucideIcon } from "lucide-react";

import { ClassCardBanner } from "@/components/classroom/class-banner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { dueLabel } from "@/lib/classroom/due";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ClassCardData = {
  id: string;
  name: string;
  section: string | null;
  subject: string | null;
  studentCount: number;
  /** Papers in the review queue. */
  pendingReview: number;
  /** Papers waiting on an AI first pass. */
  readyForAi: number;
  /** Assignments with papers in the review queue, for the To review deep link. */
  pendingAssignmentIds: string[];
  /** Up to two assignments due soon, soonest first. */
  upcoming: { id: string; title: string; dueDate: Date }[];
};

/** Straight to the one assignment with papers to review, else the whole queue. */
export function classReviewHref(data: Pick<ClassCardData, "pendingAssignmentIds">): string {
  const [only, ...rest] = data.pendingAssignmentIds;
  return only && rest.length === 0 ? `/review?assignment=${encodeURIComponent(only)}` : "/review";
}

function FooterAction({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button asChild variant="ghost" size="icon">
          <Link href={href} aria-label={label}>
            <Icon className="size-5" aria-hidden />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * A class on Home and Classes, like a Google Classroom class card: the class
 * banner (name links to the Stream), the teacher's avatar over its bottom
 * edge, work due soon, the review backlog, and footer shortcuts to Classwork,
 * Grades, and To review.
 */
export function ClassCard({
  data,
  teacherName,
  now,
  className,
}: {
  data: ClassCardData;
  teacherName: string;
  now: Date;
  className?: string;
}) {
  const base = `/classes/${encodeURIComponent(data.id)}`;
  const hasReview = data.pendingReview > 0;

  return (
    <article
      aria-label={data.name}
      className={cn(
        "relative flex h-full min-h-[18.5rem] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-hover",
        className
      )}
    >
      <ClassCardBanner
        name={data.name}
        section={data.section}
        subject={data.subject}
        href={base}
        meta={pluralize(data.studentCount, "student")}
      />
      {/* The teacher's avatar sits over the banner's bottom edge, as in Classroom. */}
      <Avatar
        name={teacherName}
        title={teacherName}
        className="absolute top-[4.5rem] right-4 size-16 bg-primary-soft text-xl font-medium text-primary-soft-foreground ring-4 ring-card"
      />

      <div className="flex flex-1 flex-col gap-3 px-4 pt-3 pb-4">
        {data.upcoming.length > 0 ? (
          <ul className="space-y-1.5" aria-label="Due soon">
            {data.upcoming.map((item, index) => (
              <li key={item.id} className={cn("min-w-0", index === 0 && "pr-[4.5rem]")}>
                <Link
                  href={`/assignments/${encodeURIComponent(item.id)}`}
                  className="group/due -mx-1 block rounded-md px-1 py-0.5 text-[13px] leading-5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  <time dateTime={item.dueDate.toISOString()} className="block text-xs text-muted-foreground">
                    {dueLabel(item.dueDate, now)}
                  </time>
                  <span className="block truncate font-medium text-foreground group-hover/due:underline">{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pt-1 pr-[4.5rem] text-[13px] text-muted-foreground">No work due soon</p>
        )}

        {hasReview || data.readyForAi > 0 ? (
          <div className="mt-auto flex flex-wrap items-center gap-2">
            {hasReview ? (
              <Link
                href={classReviewHref(data)}
                className="tabular inline-flex h-8 items-center rounded-full bg-primary-soft px-3 text-[13px] font-medium text-primary-soft-foreground transition-shadow outline-none hover:shadow-hover focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                {data.pendingReview} to review
              </Link>
            ) : null}
            {data.readyForAi > 0 ? (
              <span className="tabular inline-flex h-8 items-center rounded-full border border-border px-3 text-[13px] text-muted-foreground">
                {data.readyForAi} ready for AI pass
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-1 border-t border-border px-2 py-1.5">
        <FooterAction href={`${base}/classwork`} label={`Classwork for ${data.name}`} icon={FolderOpen} />
        <FooterAction href={`${base}/grades`} label={`Grades for ${data.name}`} icon={Table2} />
        <FooterAction
          href={classReviewHref(data)}
          label={
            hasReview ? `To review: ${pluralize(data.pendingReview, "paper")} in ${data.name}` : `To review for ${data.name}`
          }
          icon={ClipboardCheck}
        />
      </div>
    </article>
  );
}

/** The responsive class-card grid shared by Home and Classes. */
export function ClassCardGrid({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-6 min-[600px]:grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]",
        className
      )}
      {...props}
    />
  );
}
