import Link from "next/link";
import { ArrowRight, ClipboardList, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { pluralize } from "@/lib/format";

export type ClassCardData = {
  id: string;
  name: string;
  section: string | null;
  subject: string | null;
  studentCount: number;
  assignmentCount: number;
  reviewCount: number;
  readyCount: number;
};

/** A whole-card link to a class with its roster size and grading backlog. */
export function ClassCard({ data }: { data: ClassCardData }) {
  const eyebrow = [data.section, data.subject].filter(Boolean).join(" · ");
  const hasBacklog = data.reviewCount > 0 || data.readyCount > 0;

  return (
    <Link
      href={`/classes/${data.id}`}
      className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-card transition-[box-shadow,border-color] outline-none hover:border-primary/25 hover:shadow-raised focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          {eyebrow ? <p className="truncate text-[13px] font-medium text-muted-foreground">{eyebrow}</p> : null}
          <h2 className="truncate text-base font-semibold tracking-tight text-foreground">{data.name}</h2>
        </div>
        <ArrowRight
          className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
          aria-hidden
        />
      </div>

      <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Users className="size-4" aria-hidden />
          <dt className="sr-only">Students</dt>
          <dd className="tabular">{pluralize(data.studentCount, "student")}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <ClipboardList className="size-4" aria-hidden />
          <dt className="sr-only">Assignments</dt>
          <dd className="tabular">{pluralize(data.assignmentCount, "assignment")}</dd>
        </div>
      </dl>

      <div className="mt-6 flex min-h-6 flex-wrap items-center gap-2 border-t border-border pt-4">
        {data.reviewCount > 0 ? (
          <Badge variant="warning" className="tabular">
            {data.reviewCount} to review
          </Badge>
        ) : null}
        {data.readyCount > 0 ? (
          <Badge variant="secondary" className="tabular">
            {data.readyCount} ready for AI pass
          </Badge>
        ) : null}
        {!hasBacklog ? (
          <span className="text-[13px] text-muted-foreground">
            {data.assignmentCount === 0 ? "No assignments yet" : "All caught up"}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
