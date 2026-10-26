import Link from "next/link";
import { FolderOpen, SquareUserRound, type LucideIcon } from "lucide-react";

import { ClassCardBanner } from "@/components/classroom/class-banner";
import { dueSoon, relativeDue, todoTabFor, type StudentWorkRow } from "@/components/student/todo-model";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type StudentClassCardData = {
  id: string;
  name: string;
  section: string | null;
  subject: string | null;
  teacherName: string;
  /** Up to two of this student's assignments due soon, soonest first, with labels computed on the server. */
  dueSoon: { id: string; title: string; dueText: string; dueDate: string | null }[];
  /** This student's missing work in the class. */
  missing: number;
};

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
 * A class on the student Home, like a Google Classroom class card: the class
 * banner (name opens the Stream, teacher on the third line), the teacher's
 * avatar over its bottom edge, this student's work due soon, and footer
 * shortcuts to their work and the class's Classwork.
 */
export function StudentClassCard({ data, className }: { data: StudentClassCardData; className?: string }) {
  const base = `/student/classes/${encodeURIComponent(data.id)}`;
  const todoHref = `/student/todo?class=${encodeURIComponent(data.id)}`;

  return (
    <article
      aria-label={data.name}
      className={cn(
        "relative flex h-full min-h-60 min-w-0 flex-col min-[600px]:min-h-[18.5rem] overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-hover",
        className
      )}
    >
      <ClassCardBanner
        name={data.name}
        section={data.section}
        subject={data.subject}
        href={base}
        meta={data.teacherName}
      />
      {/* The teacher's avatar sits over the banner's bottom edge, as in Classroom. */}
      <Avatar
        name={data.teacherName}
        title={data.teacherName}
        className="absolute top-[4.5rem] right-4 size-16 bg-primary-soft text-xl font-medium text-primary-soft-foreground ring-4 ring-card"
      />

      <div className="flex flex-1 flex-col gap-3 px-4 pt-3 pb-4">
        {data.dueSoon.length > 0 ? (
          <ul className="space-y-1.5" aria-label="Due soon">
            {data.dueSoon.map((item, index) => (
              <li key={item.id} className={cn("min-w-0", index === 0 && "pr-[4.5rem]")}>
                <Link
                  href={`/student/assignments/${encodeURIComponent(item.id)}`}
                  className="group/due -mx-1 block rounded-md px-1 py-0.5 text-[13px] leading-5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  {item.dueDate ? (
                    <time dateTime={item.dueDate} className="block text-xs text-muted-foreground">
                      {item.dueText}
                    </time>
                  ) : (
                    <span className="block text-xs text-muted-foreground">{item.dueText}</span>
                  )}
                  <span className="block truncate font-medium text-foreground group-hover/due:underline">
                    {item.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pt-1 pr-[4.5rem] text-[13px] text-muted-foreground">No work due soon</p>
        )}

        {data.missing > 0 ? (
          <div className="mt-auto">
            <Link
              href={`/student/todo?tab=missing&class=${encodeURIComponent(data.id)}`}
              className="tabular inline-flex h-8 items-center rounded-full bg-danger-soft px-3 text-[13px] font-medium text-danger-soft-foreground transition-shadow outline-none hover:shadow-hover focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              {data.missing} missing
            </Link>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-1 border-t border-border px-2 py-1.5">
        <FooterAction href={todoHref} label={`Your work in ${data.name}`} icon={SquareUserRound} />
        <FooterAction href={`${base}/classwork`} label={`Classwork for ${data.name}`} icon={FolderOpen} />
      </div>
    </article>
  );
}

/** The responsive class-card grid on the student Home. */
export function StudentClassCardGrid({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("grid grid-cols-1 gap-6 min-[600px]:grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]", className)}
      {...props}
    />
  );
}

/**
 * Card data for each class from the student's own work rows. Labels use the
 * request's `now` in the viewer's `timeZone` (undefined: the server's zone).
 */
export function buildClassCards(
  classes: { id: string; name: string; section: string | null; subject: string | null; teacherName: string }[],
  rows: readonly StudentWorkRow[],
  now: Date,
  timeZone?: string
): StudentClassCardData[] {
  return classes.map((klass) => {
    const inClass = rows.filter((row) => row.classId === klass.id);
    return {
      ...klass,
      dueSoon: dueSoon(inClass, now, 2, { timeZone }).map((row) => ({
        id: row.id,
        title: row.title,
        dueText: relativeDue(row, now, timeZone),
        dueDate: row.dueDate,
      })),
      missing: inClass.filter((row) => todoTabFor(row) === "missing").length,
    };
  });
}
