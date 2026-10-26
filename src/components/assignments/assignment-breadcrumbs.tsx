import Link from "next/link";
import { ArrowLeft, ChevronRight } from "@/components/icons";

import { ClassAvatar } from "@/components/classroom/class-avatar";
import { classTheme } from "@/lib/ui/class-theme";

const linkFocus = "outline-none focus-visible:ring-[3px] focus-visible:ring-ring";

/**
 * A 4px rule in the class color under the app bar: the same "which class am
 * I in" cue the class tab bar gives on Stream, Classwork, People and Grades,
 * for class pages that live outside it (an assignment). Render it full width,
 * before the page container.
 */
export function ClassAccentBar({ classTitle }: { classTitle: string }) {
  return (
    <div
      aria-hidden
      data-class-accent-bar
      className="sticky top-16 z-30 h-1"
      style={{ backgroundColor: classTheme({ name: classTitle }).accent }}
    />
  );
}

/**
 * Wayfinding for an assignment, which lives outside the class tab bar. From
 * sm up, breadcrumbs: Class › Classwork › this assignment (the last crumb is
 * the current page). On phones, one back arrow to Classwork with the class
 * name.
 */
export function AssignmentBreadcrumbs({
  classId,
  classTitle,
  section,
  title,
}: {
  classId: string;
  /** The school class's display name (not a CSS class). */
  classTitle: string;
  section: string | null;
  /** The assignment title (the current page). */
  title: string;
}) {
  const classHref = `/classes/${encodeURIComponent(classId)}`;
  const classworkHref = `${classHref}/classwork`;
  const classLabel = [classTitle, section].filter(Boolean).join(" · ");

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      {/* Phones: a back arrow to Classwork, with the class name. */}
      <Link
        href={classworkHref}
        className={`-ml-2 inline-flex min-h-10 max-w-full items-center gap-2 rounded-full pr-3 pl-2 text-sm font-medium text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground sm:hidden ${linkFocus}`}
      >
        <ArrowLeft className="size-5 shrink-0 text-foreground" aria-hidden />
        <span className="min-w-0 truncate">
          <span className="sr-only">Back to </span>
          <span className="text-foreground">{classTitle}</span> · Classwork
        </span>
      </Link>

      <ol className="hidden min-w-0 items-center gap-1 text-[0.8125rem] font-medium text-muted-foreground sm:flex">
        <li className="min-w-0 shrink">
          <Link
            href={classHref}
            className={`flex min-w-0 items-center gap-2 rounded-full py-1 pr-2 hover:text-foreground ${linkFocus}`}
          >
            <ClassAvatar name={classTitle} className="size-6 text-[0.6875rem]" />
            <span className="truncate">{classLabel}</span>
          </Link>
        </li>
        <li aria-hidden>
          <ChevronRight className="size-4 shrink-0" />
        </li>
        <li className="shrink-0">
          <Link href={classworkHref} className={`rounded-sm px-0.5 py-1 hover:text-foreground ${linkFocus}`}>
            Classwork
          </Link>
        </li>
        <li aria-hidden>
          <ChevronRight className="size-4 shrink-0" />
        </li>
        <li className="min-w-0 flex-1">
          <span aria-current="page" className="block max-w-[40ch] truncate px-0.5 text-foreground">
            {title}
          </span>
        </li>
      </ol>
    </nav>
  );
}
