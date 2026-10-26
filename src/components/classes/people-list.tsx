import Link from "next/link";
import { ChevronRight, Users } from "@/components/icons";

import { AddStudentDialog } from "@/components/classes/add-student-dialog";
import { Avatar } from "@/components/ui/avatar";
import { pluralize } from "@/lib/format";
import { studentProfileHref } from "@/lib/insights/links";
import { cn } from "@/lib/utils";

/*
 * Google Classroom's People tab: "Teachers" and "Students" headings in the
 * primary color over a primary rule, then one row per person.
 */

function PeopleHeading({
  id,
  title,
  aside,
}: {
  id: string;
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-16 items-end justify-between gap-4 border-b border-primary pb-2">
      <h2 id={id} className="text-[1.75rem] leading-9 font-normal text-primary sm:text-[2rem] sm:leading-10">
        {title}
      </h2>
      {aside ? <div className="flex shrink-0 items-center gap-2 pb-0.5">{aside}</div> : null}
    </div>
  );
}

/** One person per row; compact density tightens the rows (targets stay 48px+). */
const rowClass = "flex min-h-row-min items-center gap-4 px-2 py-2 compact:py-1 sm:px-4";

export function TeachersSection({ teacherName }: { teacherName: string }) {
  return (
    <section aria-labelledby="people-teachers-heading">
      <PeopleHeading id="people-teachers-heading" title="Teachers" />
      <ul className="mt-2">
        <li className={rowClass}>
          <Avatar name={teacherName} className="size-9 bg-primary-soft text-primary-soft-foreground ring-0 compact:size-8" />
          <span className="min-w-0 truncate text-sm font-medium text-foreground">{teacherName}</span>
        </li>
      </ul>
    </section>
  );
}

export type PeopleStudent = { id: string; name: string };

/** The class roster: each row opens the student's profile (stats and conference brief). */
export function StudentsSection({
  classId,
  classTitle,
  students,
  className,
}: {
  classId: string;
  /** The school class's display name (not a CSS class). */
  classTitle: string;
  students: PeopleStudent[];
  className?: string;
}) {
  return (
    <section aria-labelledby="people-students-heading" className={className}>
      <PeopleHeading
        id="people-students-heading"
        title="Students"
        aside={
          <>
            <span className="tabular text-sm font-medium text-primary max-sm:hidden">
              {pluralize(students.length, "student")}
            </span>
            <AddStudentDialog classId={classId} classTitle={classTitle} variant="tonal" size="default" />
          </>
        }
      />
      <p className="tabular px-2 pt-2 text-sm font-medium text-primary sm:hidden">{pluralize(students.length, "student")}</p>
      {students.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
            <Users className="size-6" aria-hidden />
          </span>
          <p className="font-display text-base font-medium text-foreground">Add students to start collecting papers.</p>
          <p className="mt-1 max-w-sm text-sm text-pretty text-muted-foreground">
            Use fictional names: this is a demo roster.
          </p>
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {students.map((student) => (
            <li key={student.id}>
              <Link
                href={studentProfileHref(classId, student.id)}
                className={cn(
                  rowClass,
                  "group rounded-lg transition-colors outline-none hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset"
                )}
              >
                <Avatar name={student.name} className="size-9 compact:size-8" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{student.name}</span>
                <span aria-hidden className="hidden text-xs text-muted-foreground sm:group-hover:inline sm:group-focus-visible:inline">
                  View profile
                </span>
                <ChevronRight
                  className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
