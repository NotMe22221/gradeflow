import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";

import { AddStudentDialog } from "@/components/classes/add-student-dialog";
import { EmptyState } from "@/components/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pluralize } from "@/lib/format";
import { studentProfileHref } from "@/lib/insights/links";

export type RosterEntry = { id: string; name: string; email: string };

export function RosterCard({
  classId,
  classTitle,
  students,
}: {
  classId: string;
  /** The school class's display name (not a CSS class). */
  classTitle: string;
  students: RosterEntry[];
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start gap-4 pb-4">
        <div className="min-w-0 space-y-1.5">
          <CardTitle>
            <h2>Roster</h2>
          </CardTitle>
          <CardDescription className="tabular">
            {students.length === 0 ? "Fictional demo students only." : pluralize(students.length, "student")}
          </CardDescription>
        </div>
        <CardAction>
          <AddStudentDialog classId={classId} classTitle={classTitle} />
        </CardAction>
      </CardHeader>
      {students.length === 0 ? (
        <div className="px-6 pb-6">
          <EmptyState icon={Users} title="Add students to start collecting papers." className="py-10" />
        </div>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {students.map((student) => (
            <li key={student.id}>
              <Link
                href={studentProfileHref(classId, student.id)}
                className="group flex items-center gap-3 px-6 py-3 transition-colors outline-none hover:bg-background focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset"
              >
                <Avatar name={student.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{student.name}</p>
                  <p className="truncate text-[13px] text-muted-foreground" title={student.email}>
                    {student.email}
                  </p>
                </div>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
