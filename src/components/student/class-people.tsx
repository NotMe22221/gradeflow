import { Users } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { pluralize } from "@/lib/format";

/*
 * Google Classroom's People tab, as a student sees it: the teacher, then
 * classmates. Names only: no emails, profiles, or other student data.
 */

function PeopleHeading({ id, title, aside }: { id: string; title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex min-h-16 items-end justify-between gap-4 border-b border-primary pb-2">
      <h2 id={id} className="text-[28px] leading-9 font-normal text-primary sm:text-[32px] sm:leading-10">
        {title}
      </h2>
      {aside ? <div className="flex shrink-0 items-center gap-2 pb-1">{aside}</div> : null}
    </div>
  );
}

const rowClass = "flex min-h-14 items-center gap-4 px-2 py-2 sm:px-4";

export function StudentPeople({
  teacherName,
  classmates,
}: {
  teacherName: string;
  classmates: { id: string; name: string; isYou: boolean }[];
}) {
  return (
    <div className="space-y-10">
      <section aria-labelledby="people-teachers-heading">
        <PeopleHeading id="people-teachers-heading" title="Teachers" />
        <ul className="mt-2">
          <li className={rowClass}>
            <Avatar name={teacherName} className="size-9 bg-primary-soft text-primary-soft-foreground ring-0" />
            <span className="min-w-0 truncate text-sm font-medium text-foreground">{teacherName}</span>
          </li>
        </ul>
      </section>

      <section aria-labelledby="people-classmates-heading">
        <PeopleHeading
          id="people-classmates-heading"
          title="Classmates"
          aside={
            <span className="tabular text-sm font-medium text-primary">{pluralize(classmates.length, "student")}</span>
          }
        />
        {classmates.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
              <Users className="size-6" aria-hidden />
            </span>
            <p className="font-display text-base font-medium text-foreground">Your classmates show up here.</p>
            <p className="mt-1 max-w-sm text-sm text-pretty text-muted-foreground">
              Your teacher adds students to the class.
            </p>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {classmates.map((person) => (
              <li key={person.id} className={rowClass}>
                <Avatar name={person.name} className="size-9 ring-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{person.name}</span>
                {person.isYou ? <span className="shrink-0 text-xs text-muted-foreground">You</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
