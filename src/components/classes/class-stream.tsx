import Link from "next/link";
import {
  ChartColumn,
  ChevronRight,
  CircleCheckBig,
  ClipboardList,
  FactCheck,
  FileText,
  PenLine,
  Plus,
  ScanLine,
  type IconComponent,
} from "@/components/icons";

import { EmptyState } from "@/components/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { dueLabel, streamTime } from "@/lib/classroom/due";
import type { StreamItem } from "@/lib/classroom/feed";
import { formatDateTime, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
 * The pieces of a teacher's class Stream, in Google Classroom's layout: an
 * "Upcoming" card and a tools card in the left column, then a composer row
 * and the activity feed. The feed is one calm list (dividers, not a stack of
 * bordered cards), with soft class-colored icons so the one action that needs
 * the teacher (drafts to review) is the only thing that stands out.
 */

function SideCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  const id = `stream-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className={cn("min-w-0 rounded-xl border border-border bg-card p-4", className)}>
      <h2 id={id} className="text-sm font-medium text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** "Upcoming": assignments due soon, each linking to its page, then "View all". */
export function StreamUpcomingCard({
  classId,
  items,
  now,
  timeZone,
}: {
  classId: string;
  items: { id: string; title: string; dueDate: Date }[];
  now: Date;
  /** The viewer's time zone (viewerTimeZone()); undefined uses the server's. */
  timeZone?: string;
}) {
  return (
    <SideCard title="Upcoming">
      {items.length === 0 ? (
        <p className="mt-3 text-[0.8125rem] text-muted-foreground">No work due soon</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/assignments/${encodeURIComponent(item.id)}`}
                className="group -mx-2 block rounded-lg px-2 py-1.5 outline-none hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                <time dateTime={item.dueDate.toISOString()} className="block text-xs text-muted-foreground">
                  {dueLabel(item.dueDate, now, { timeZone })}
                </time>
                <span className="line-clamp-2 text-sm leading-5 font-medium text-foreground group-hover:underline">
                  {item.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex justify-end">
        <Button asChild variant="text" size="sm" className="-mr-2 h-10">
          <Link href={`/classes/${encodeURIComponent(classId)}/classwork`}>View all</Link>
        </Button>
      </div>
    </SideCard>
  );
}

function ToolLink({ href, icon: Icon, children }: { href: string; icon: IconComponent; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="group -mx-2 flex min-h-10 items-center gap-3 rounded-full px-2 text-sm font-medium text-foreground outline-none hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Icon className="size-[1.125rem]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate">{children}</span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

/** Shortcuts to the tools for this class: the Paper Scanner and the class heatmap. */
export function StreamToolsCard({ scanHref, heatmapHref }: { scanHref: string; heatmapHref: string }) {
  return (
    <SideCard title="Teaching tools">
      <ul className="mt-2 space-y-0.5">
        <ToolLink href={scanHref} icon={ScanLine}>
          Scan papers
        </ToolLink>
        <ToolLink href={heatmapHref} icon={ChartColumn}>
          Open heatmap
        </ToolLink>
      </ul>
    </SideCard>
  );
}

/** The top of the Stream: the teacher's avatar and the two kinds of work they can post. */
export function StreamComposer({ classId, teacherName }: { classId: string; teacherName: string }) {
  const base = `/classes/${encodeURIComponent(classId)}/assignments/new`;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-card px-4 py-3 sm:px-5">
      <Avatar name={teacherName} className="size-10 bg-primary-soft text-sm font-medium text-primary-soft-foreground ring-0" />
      <p className="min-w-0 flex-1 basis-40 text-sm text-muted-foreground">Share new work with your class</p>
      {/* Visible labels stay short so both fit on a phone; the accessible names say "New ...". */}
      <div className="-mx-2 flex flex-wrap items-center gap-1 max-sm:w-full">
        <Button asChild variant="text" className="has-[>svg]:pr-4 has-[>svg]:pl-3">
          <Link href={base} aria-label="New assignment">
            <Plus aria-hidden />
            Assignment
          </Link>
        </Button>
        <Button asChild variant="text" className="has-[>svg]:pr-4 has-[>svg]:pl-3">
          <Link href={`${base}?kind=TEST`} aria-label="New handwritten test">
            <ScanLine aria-hidden />
            Handwritten test
          </Link>
        </Button>
      </div>
    </div>
  );
}

function names(list: string[], shown = 3): string {
  const head = list.slice(0, shown).join(", ");
  return list.length > shown ? `${head} and ${list.length - shown} more` : head;
}

function describe(item: StreamItem, teacherName: string): { icon: IconComponent; text: React.ReactNode; meta?: string } {
  const title = <span className="font-medium">{item.title}</span>;
  switch (item.kind) {
    case "posted":
      return {
        icon: item.isTest ? ScanLine : FileText,
        text: (
          <>
            {teacherName} posted a new {item.isTest ? "handwritten test" : "assignment"}: {title}
          </>
        ),
      };
    case "returned":
      return {
        icon: CircleCheckBig,
        text: (
          <>
            {pluralize(item.count, "grade")} returned for {title}
          </>
        ),
        meta: "Approved by you",
      };
    case "scanned":
      if (item.studentNames.length === 1) {
        return {
          icon: ScanLine,
          text: (
            <>
              {item.studentNames[0]}&rsquo;s test was scanned for {title}
            </>
          ),
        };
      }
      return {
        icon: ScanLine,
        text: (
          <>
            {pluralize(item.studentNames.length, "test")} scanned for {title}
          </>
        ),
        meta: names(item.studentNames),
      };
    case "drafts":
      // Named for what it is: draft grades (suggested scores), not "AI" output.
      return {
        icon: PenLine,
        text: (
          <>
            {pluralize(item.count, "draft grade")} ready for review: {title}
          </>
        ),
        meta: "Students see nothing until you approve",
      };
  }
}

/** Opens To review on this assignment's drafts. Sits above the row's stretched link. */
function ReviewDraftsButton({ item, className }: { item: StreamItem; className?: string }) {
  return (
    <Button asChild variant="tonal" size="sm" className={cn("relative z-10 h-10 shrink-0", className)}>
      <Link href={`/review?assignment=${encodeURIComponent(item.assignmentId)}`} aria-label={`Review draft grades for ${item.title}`}>
        <FactCheck aria-hidden />
        Review
      </Link>
    </Button>
  );
}

/**
 * The Stream's activity feed, newest first, as one list. Each row links to
 * its assignment; drafts waiting for review also get a Review button.
 */
export function StreamFeed({
  items,
  teacherName,
  classAccent,
  now,
  timeZone,
}: {
  items: StreamItem[];
  teacherName: string;
  /** The class accent (classTheme(klass).accent): the icon color, and a tint of it behind the icon. */
  classAccent: string;
  now: Date;
  /** The viewer's time zone (viewerTimeZone()); undefined uses the server's. */
  timeZone?: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="This is where you'll see what's happening in your class."
        description="Post an assignment and its activity shows up here: papers scanned, draft grades to review, and grades returned."
        className="rounded-xl py-14"
      />
    );
  }

  const iconStyle = {
    color: classAccent,
    backgroundColor: `color-mix(in srgb, ${classAccent} 13%, transparent)`,
  };

  return (
    <section aria-labelledby="stream-activity-heading" className="overflow-hidden rounded-xl border border-border bg-card">
      <h2 id="stream-activity-heading" className="px-4 pt-4 pb-2 text-sm font-medium text-foreground sm:px-5">
        Class activity
      </h2>
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const { icon: Icon, text, meta } = describe(item, teacherName);
          const href = `/assignments/${encodeURIComponent(item.assignmentId)}`;
          const drafts = item.kind === "drafts";
          const demoOnly = drafts && item.demoCount > 0;
          return (
            <li
              key={item.key}
              className="relative flex items-start gap-4 px-4 py-row transition-colors hover:bg-foreground/[0.03] sm:px-5"
            >
              <span aria-hidden className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full" style={iconStyle}>
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="max-w-[75ch] text-sm leading-5 text-pretty break-words text-foreground">
                  <Link
                    href={href}
                    className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-[3px] focus-visible:after:ring-ring focus-visible:after:ring-inset"
                  >
                    {text}
                  </Link>
                </p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  <time dateTime={item.at.toISOString()} title={formatDateTime(item.at, timeZone)}>
                    {streamTime(item.at, now, timeZone)}
                  </time>
                  {meta ? <span> · {meta}</span> : null}
                  {demoOnly ? (
                    <span className="ml-1.5 inline-flex h-5 items-center rounded-md border border-dashed border-input/70 px-1.5 align-middle text-[0.6875rem] font-medium whitespace-nowrap">
                      {item.demoCount === item.count ? "Demo grader" : `Demo grader on ${item.demoCount}`}
                    </span>
                  ) : null}
                </p>
                {drafts ? <ReviewDraftsButton item={item} className="mt-2 sm:hidden" /> : null}
              </div>
              {drafts ? <ReviewDraftsButton item={item} className="max-sm:hidden" /> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
