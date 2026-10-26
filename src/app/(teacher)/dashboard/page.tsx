import type { Metadata } from "next";

import { BookOpen } from "@/components/icons";
import { ClassCard } from "@/components/classes/class-card";
import { NewClassDialog } from "@/components/classes/new-class-dialog";
import { AttentionNotice } from "@/components/dashboard/attention-notice";
import { MostMissedCard } from "@/components/dashboard/most-missed-card";
import { RecentlyPublished } from "@/components/dashboard/recently-published";
import { StatRow } from "@/components/dashboard/stat-row";
import { TeachingTools } from "@/components/dashboard/teaching-tools";
import { EmptyState } from "@/components/empty-state";
import { ArrangeableClassGrid } from "@/components/layout-editor/arrangeable-class-grid";
import { CustomizableSections, type SectionSpec } from "@/components/layout-editor/customizable-sections";
import { ArrangeButton, FixedRegion, LayoutEditorProvider } from "@/components/layout-editor/editor-context";
import { PageContainer } from "@/components/page-header";
import { requireTeacherPage } from "@/lib/auth/session";
import { getUpcomingByClass } from "@/lib/classroom/stream";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";
import { firstName } from "@/lib/format";
import { getMostMissedForTeacher, listBriefStudents } from "@/lib/insights/query";
import { defaultSectionLayout, SURFACE_SECTIONS } from "@/lib/preferences/schema";
import { getPreferences } from "@/lib/preferences/server";
import {
  getClassSummaries,
  getDashboardStats,
  getReadyForAiAssignments,
  getRecentlyPublished,
  getReviewQueueAssignments,
} from "@/lib/stats";

export const metadata: Metadata = { title: "Home" };

/** "Monday, October 26": today in the viewer's zone (undefined: the server's). */
function todayLabel(now: Date, timeZone: string | undefined): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone }).format(now);
}

const SECTIONS = SURFACE_SECTIONS.teacherHome;

/**
 * Teacher Home. The greeting and the "what needs you" notice stay on top;
 * below them the five sections (this week, teaching tools, your classes,
 * recently returned, most missed) sit in the teacher's saved arrangement,
 * which Arrange (or ?customize=1) lets them rearrange.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const teacher = await requireTeacherPage();
  const now = new Date();
  const [timeZone, preferences, params] = await Promise.all([
    viewerTimeZone(),
    getPreferences(teacher.id),
    searchParams,
  ]);

  const [stats, classes, upcoming, recent, ready, review, mostMissed, briefClasses] = await Promise.all([
    getDashboardStats(teacher.id, now),
    getClassSummaries(teacher.id, now),
    getUpcomingByClass(teacher.id, now, 2, timeZone),
    getRecentlyPublished(teacher.id, 5),
    getReadyForAiAssignments(teacher.id, now),
    getReviewQueueAssignments(teacher.id),
    getMostMissedForTeacher(teacher.id, 3),
    listBriefStudents(teacher.id),
  ]);

  const sections: Record<string, SectionSpec> = {
    stats: {
      title: SECTIONS.stats.label,
      node: <StatRow stats={stats} />,
    },
    tools: {
      title: SECTIONS.tools.label,
      node: <TeachingTools briefClasses={briefClasses} />,
    },
    classes: {
      title: SECTIONS.classes.label,
      essential: SECTIONS.classes.essential,
      live: true,
      action: classes.length > 0 ? { href: "/classes", label: "View all" } : undefined,
      node: (
        <ArrangeableClassGrid
          label="Your classes"
          items={classes.map((summary) => ({
            id: summary.id,
            name: summary.name,
            node: (
              <ClassCard
                data={{ ...summary, upcoming: upcoming.get(summary.id) ?? [] }}
                teacherName={teacher.name}
                now={now}
                timeZone={timeZone}
              />
            ),
          }))}
          empty={
            <EmptyState
              icon={BookOpen}
              title="Create your first class to start grading."
              description="Add a class and its students, then set up an assignment with a rubric."
              action={<NewClassDialog />}
            />
          }
        />
      ),
    },
    recent: {
      title: SECTIONS.recent.label,
      action: { href: "/gradebook", label: "Gradebook" },
      node: <RecentlyPublished items={recent} now={now} timeZone={timeZone} />,
    },
    missed: {
      title: SECTIONS.missed.label,
      action: { href: "/insights", label: "Insights" },
      node: <MostMissedCard items={mostMissed} hasClasses={classes.length > 0} />,
    },
  };

  return (
    <PageContainer>
      <LayoutEditorProvider
        surface="teacherHome"
        layout={preferences.layout.teacherHome}
        defaultLayout={defaultSectionLayout("teacherHome")}
        classOrder={preferences.layout.classOrder}
        label="your Home"
        startEditing={params.customize === "1"}
      >
        <FixedRegion>
          {/* Phones: Arrange sits beside the date, so the greeting keeps the full width. */}
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
            <p className="text-[0.8125rem] font-medium text-muted-foreground">{todayLabel(now, timeZone)}</p>
            <ArrangeButton className="col-start-2 row-start-1 sm:row-span-2 sm:self-end" />
            <h1 className="col-span-2 text-[1.625rem] leading-tight font-medium text-balance text-foreground sm:col-span-1 sm:text-[1.75rem]">
              Welcome back, {firstName(teacher.name)}
            </h1>
          </header>

          <AttentionNotice
            className="mt-6"
            pendingReview={stats.pendingReview}
            readyForAi={stats.readyForAi}
            review={review}
            ready={ready}
            hasClasses={classes.length > 0}
          />
        </FixedRegion>

        <CustomizableSections className="mt-10" sections={sections} />
      </LayoutEditorProvider>
    </PageContainer>
  );
}
