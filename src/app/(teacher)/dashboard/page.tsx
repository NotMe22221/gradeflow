import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ClipboardCheck, Table2 } from "@/components/icons";

import { ClassCard, ClassCardGrid } from "@/components/classes/class-card";
import { NewClassDialog } from "@/components/classes/new-class-dialog";
import { MostMissedCard } from "@/components/dashboard/most-missed-card";
import { ReadyForAiCallout } from "@/components/dashboard/ready-for-ai-callout";
import { RecentlyPublished } from "@/components/dashboard/recently-published";
import { SectionHeader } from "@/components/dashboard/section-header";
import { StatRow } from "@/components/dashboard/stat-row";
import { TeachingTools } from "@/components/dashboard/teaching-tools";
import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireTeacherPage } from "@/lib/auth/session";
import { getUpcomingByClass } from "@/lib/classroom/stream";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";
import { firstName, pluralize } from "@/lib/format";
import { getMostMissedForTeacher, listBriefStudents } from "@/lib/insights/query";
import {
  getClassSummaries,
  getDashboardStats,
  getReadyForAiAssignments,
  getRecentlyPublished,
} from "@/lib/stats";

export const metadata: Metadata = { title: "Home" };

/** "Monday, October 26": today in the viewer's zone (undefined: the server's). */
function todayLabel(now: Date, timeZone: string | undefined): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone }).format(now);
}

export default async function DashboardPage() {
  const teacher = await requireTeacherPage();
  const now = new Date();
  const timeZone = await viewerTimeZone();

  const [stats, classes, upcoming, recent, readyAssignments, mostMissed, briefClasses] = await Promise.all([
    getDashboardStats(teacher.id, now),
    getClassSummaries(teacher.id, now),
    getUpcomingByClass(teacher.id, now, 2, timeZone),
    getRecentlyPublished(teacher.id, 5),
    getReadyForAiAssignments(teacher.id, now),
    getMostMissedForTeacher(teacher.id, 3),
    listBriefStudents(teacher.id),
  ]);

  const pending = stats.pendingReview;
  const statusLine =
    pending > 0
      ? `${pluralize(pending, "paper")} waiting for your review`
      : stats.readyForAi > 0
        ? "Nothing is waiting for your review"
        : "You're all caught up";

  return (
    <PageContainer>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[0.8125rem] font-medium text-muted-foreground">{todayLabel(now, timeZone)}</p>
          <h1 className="text-[1.625rem] leading-tight font-medium text-balance text-foreground sm:text-[1.75rem]">
            Welcome back, {firstName(teacher.name)}
          </h1>
          <p className="text-[0.9375rem] text-muted-foreground">{statusLine}</p>
        </div>
        {pending > 0 ? (
          <Button asChild className="self-start sm:self-auto">
            <Link href="/review">
              <ClipboardCheck aria-hidden />
              Open To review
            </Link>
          </Button>
        ) : classes.length > 0 ? (
          <Button asChild variant="outline" className="self-start sm:self-auto">
            <Link href="/gradebook">
              <Table2 aria-hidden />
              Open gradebook
            </Link>
          </Button>
        ) : null}
      </header>

      <ReadyForAiCallout count={stats.readyForAi} assignments={readyAssignments} className="mt-6" />

      <StatRow stats={stats} className="mt-6" />

      {/* The Paper Scanner, class heatmap, and conference briefs, one click from Home. */}
      <TeachingTools briefClasses={briefClasses} className="mt-10" />

      {/* minmax(0, 1fr) keeps long card text from widening the column past a phone screen. */}
      <div className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="classes-heading" className="min-w-0">
          <SectionHeader
            id="classes-heading"
            title="Your classes"
            href={classes.length > 0 ? "/classes" : undefined}
            linkLabel="View all"
          />
          {classes.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Create your first class to start grading."
              description="Add a class and its students, then set up an assignment with a rubric."
              action={<NewClassDialog />}
            />
          ) : (
            <ClassCardGrid>
              {classes.map((summary) => (
                <li key={summary.id} className="min-w-0">
                  <ClassCard
                    data={{ ...summary, upcoming: upcoming.get(summary.id) ?? [] }}
                    teacherName={teacher.name}
                    now={now}
                    timeZone={timeZone}
                  />
                </li>
              ))}
            </ClassCardGrid>
          )}
        </section>

        <div className="grid min-w-0 grid-cols-1 content-start gap-6 md:grid-cols-2 xl:grid-cols-1 xl:pt-14">
          <RecentlyPublished items={recent} now={now} timeZone={timeZone} />
          {classes.length > 0 ? <MostMissedCard items={mostMissed} /> : null}
        </div>
      </div>
    </PageContainer>
  );
}
