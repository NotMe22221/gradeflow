import Link from "next/link";
import {
  ChevronRight,
  CircleAlert,
  CircleCheckBig,
  ClipboardList,
  FileText,
  ScanLine,
  Undo2,
  UserRound,
  type IconComponent,
} from "@/components/icons";

import { ClassBanner } from "@/components/classroom/class-banner";
import { EmptyState } from "@/components/empty-state";
import { buildStudentStream, type StudentStreamItem } from "@/components/student/stream-model";
import {
  dueSoon,
  dueWhen,
  PAPER_TEST_NOTE,
  relativeDue,
  todoTabFor,
  type DueWhen,
  type StudentWorkRow,
} from "@/components/student/todo-model";
import { Button } from "@/components/ui/button";
import { streamTime } from "@/lib/classroom/due";
import { formatDateTime, formatScore, pluralize } from "@/lib/format";
import { classTheme } from "@/lib/ui/class-theme";

/*
 * The student's class Stream in Google Classroom's layout: an "Upcoming"
 * card on the left (this student's work due soon), then the activity feed
 * (work the teacher posted, and this student's own returned grades and
 * send-backs).
 */

export type UpcomingItem = {
  id: string;
  title: string;
  dueText: string;
  dueDate: string | null;
  /** The due date said two ways ("Due tomorrow" / "Tue, Oct 27"); dueText alone without it. */
  due?: DueWhen;
};

/**
 * "Upcoming": this student's work due soon, each linking to its page, then
 * "View all". Missing work in the class gets one calm line that leads to it.
 */
export function StudentUpcomingCard({
  classId,
  items,
  missing = 0,
}: {
  classId: string;
  items: UpcomingItem[];
  /** How many of this student's assignments in the class are missing. */
  missing?: number;
}) {
  return (
    <section aria-labelledby="upcoming-heading" className="min-w-0 rounded-3xl border border-border bg-card p-5">
      <h2 id="upcoming-heading" className="font-display text-[1.125rem] font-extrabold tracking-[-0.01em] text-foreground">
        Upcoming
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-[0.875rem] text-muted-foreground">No work due soon</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.map((item) => {
            const due = item.due ?? { relative: item.dueText, absolute: null };
            return (
              <li key={item.id}>
                <Link
                  href={`/student/assignments/${encodeURIComponent(item.id)}`}
                  className="group -mx-2 block rounded-lg px-2 py-2 outline-none hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  <span className="block text-[0.75rem] leading-4 text-muted-foreground">
                    <span className="font-medium text-foreground">{due.relative}</span>
                    {due.absolute ? (
                      item.dueDate ? (
                        <>
                          {" · "}
                          <time dateTime={item.dueDate.slice(0, 10)}>{due.absolute}</time>
                        </>
                      ) : (
                        ` · ${due.absolute}`
                      )
                    ) : null}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-[0.875rem] leading-5 font-medium text-foreground group-hover:underline">
                    {item.title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {missing > 0 ? (
        <Link
          href={`/student/todo?tab=missing&class=${encodeURIComponent(classId)}`}
          className="group -mx-2 mt-2 flex min-h-10 items-center gap-2 rounded-lg px-2 text-[0.8125rem] font-medium text-danger-soft-foreground outline-none hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 group-hover:underline">{pluralize(missing, "missing assignment")}</span>
          <ChevronRight className="size-4 shrink-0" aria-hidden />
        </Link>
      ) : null}
      <div className="mt-1 flex justify-end">
        <Button asChild variant="text" size="sm" className="-mr-2 h-10">
          <Link href={`/student/classes/${encodeURIComponent(classId)}/classwork`}>View all</Link>
        </Button>
      </div>
    </section>
  );
}

function describe(
  item: StudentStreamItem,
  teacherName: string
): { icon: IconComponent; text: React.ReactNode; meta?: string } {
  const title = <span className="font-medium">{item.title}</span>;
  switch (item.kind) {
    case "posted":
      return {
        icon: item.isTest ? ScanLine : FileText,
        text: (
          <>
            {teacherName} posted a new {item.isTest ? "paper test" : "assignment"}: {title}
          </>
        ),
        meta: item.isTest ? PAPER_TEST_NOTE : undefined,
      };
    case "graded":
      return {
        icon: CircleCheckBig,
        text: <>Your grade was returned for {title}</>,
        meta: item.score
          ? `${formatScore(item.score.total, item.score.max)} · Approved by ${teacherName}`
          : `Approved by ${teacherName}`,
      };
    case "sent_back":
      return {
        icon: Undo2,
        text: (
          <>
            {teacherName} sent back your work for {title}
          </>
        ),
        // Only an open send-back asks for anything; afterwards it is history.
        meta: item.open
          ? item.isTest
            ? "Your teacher will rescan it"
            : "See the note, then revise and resubmit"
          : item.isTest
            ? "Sent back for a rescan"
            : "Sent back for revision",
      };
  }
}

/** The Stream's activity feed, newest first. Each card links to its assignment. */
export function StudentStreamFeed({
  items,
  teacherName,
  classColor,
  now,
  timeZone,
}: {
  items: StudentStreamItem[];
  teacherName: string;
  /** The class color (classTheme(klass).color) for the icon circles. */
  classColor: string;
  now: Date;
  /** The viewer's time zone (viewerTimeZone()); undefined uses the server's. */
  timeZone?: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="This is where you'll see what's happening in your class."
        description="When your teacher posts work, it shows up here, along with your returned grades."
        className="rounded-3xl py-14"
      />
    );
  }

  return (
    <section aria-labelledby="stream-activity-heading">
      <h2 id="stream-activity-heading" className="sr-only">
        Class activity
      </h2>
      <ul className="space-y-3">
        {items.map((item) => {
          const { icon: Icon, text, meta } = describe(item, teacherName);
          return (
            <li key={item.key}>
              <article className="relative flex items-start gap-4 rounded-3xl border border-border bg-card px-4 py-row transition-[box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:shadow-raised sm:px-5 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-white compact:size-9"
                  style={{ backgroundColor: classColor }}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[0.9375rem] leading-6 text-pretty break-words text-foreground">
                    <Link
                      href={`/student/assignments/${encodeURIComponent(item.assignmentId)}`}
                      className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus-visible:after:ring-[3px] focus-visible:after:ring-ring"
                    >
                      {text}
                    </Link>
                  </p>
                  <p className="text-[0.8125rem] leading-5 text-muted-foreground">
                    <time dateTime={item.at.toISOString()} title={formatDateTime(item.at, timeZone)}>
                      {streamTime(item.at, now, timeZone)}
                    </time>
                    {meta ? <span className="tabular"> · {meta}</span> : null}
                  </p>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The whole Stream tab: banner, Upcoming, and the feed, from this student's own rows. */
export function StudentClassStreamView({
  klass,
  rows,
  now,
  timeZone,
}: {
  klass: { id: string; name: string; section: string | null; subject: string | null; teacherName: string };
  rows: StudentWorkRow[];
  now: Date;
  /** The viewer's time zone (viewerTimeZone()); undefined uses the server's. */
  timeZone?: string;
}) {
  const upcoming = dueSoon(rows, now, 3, { timeZone }).map((row) => ({
    id: row.id,
    title: row.title,
    dueText: relativeDue(row, now, timeZone),
    dueDate: row.dueDate,
    due: dueWhen(row, now, timeZone),
  }));
  const missing = rows.filter((row) => todoTabFor(row) === "missing").length;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <ClassBanner name={klass.name} section={klass.section} subject={klass.subject}>
        <span className="inline-flex items-center gap-1.5">
          <UserRound className="size-4" aria-hidden />
          {klass.teacherName}
        </span>
      </ClassBanner>

      {/* Side by side once the page itself has room (<main> is a container), not the window. */}
      <div className="mt-6 grid grid-cols-1 gap-6 @min-[44rem]:grid-cols-[15rem_minmax(0,1fr)]">
        <aside aria-label="Class overview" className="min-w-0">
          <StudentUpcomingCard classId={klass.id} items={upcoming} missing={missing} />
        </aside>
        <div className="min-w-0">
          <StudentStreamFeed
            items={buildStudentStream(rows)}
            teacherName={klass.teacherName}
            classColor={classTheme(klass).color}
            now={now}
            timeZone={timeZone}
          />
        </div>
      </div>
    </div>
  );
}
