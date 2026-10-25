import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Inbox, Table2 } from "lucide-react";

import { DashboardClassCard } from "@/components/dashboard/class-card";
import { MostMissedCard } from "@/components/dashboard/most-missed-card";
import { ReadyForAiCallout } from "@/components/dashboard/ready-for-ai-callout";
import { RecentlyPublished } from "@/components/dashboard/recently-published";
import { SectionHeader } from "@/components/dashboard/section-header";
import { StatRow } from "@/components/dashboard/stat-row";
import { TeachingTools } from "@/components/dashboard/teaching-tools";
import { EmptyState } from "@/components/empty-state";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireTeacherPage } from "@/lib/auth/session";
import { firstName, pluralize } from "@/lib/format";
import { getMostMissedForTeacher, listBriefStudents } from "@/lib/insights/query";
import {
  getClassSummaries,
  getDashboardStats,
  getReadyForAiAssignments,
  getRecentlyPublished,
} from "@/lib/stats";

export const metadata: Metadata = { title: "Dashboard" };

const todayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

export default async function DashboardPage() {
  const teacher = await requireTeacherPage();
  const now = new Date();

  const [stats, classes, recent, readyAssignments, mostMissed, briefClasses] = await Promise.all([
    getDashboardStats(teacher.id, now),
    getClassSummaries(teacher.id, now),
    getRecentlyPublished(teacher.id, 5),
    getReadyForAiAssignments(teacher.id),
    getMostMissedForTeacher(teacher.id, 3),
    listBriefStudents(teacher.id),
  ]);

  const pending = stats.pendingReview;
  const statusLine =
    pending > 0 ? `${pluralize(pending, "paper")} waiting for your review` : "You're all caught up";

  return (
    <PageContainer>
      <PageHeader
        eyebrow={todayFormatter.format(now)}
        title={`Welcome back, ${firstName(teacher.name)}`}
        description={statusLine}
        actions={
          pending > 0 ? (
            <Button asChild>
              <Link href="/review">
                <Inbox aria-hidden />
                Open review queue
              </Link>
            </Button>
          ) : classes.length > 0 ? (
            <Button asChild variant="outline">
              <Link href="/gradebook">
                <Table2 aria-hidden />
                Open gradebook
              </Link>
            </Button>
          ) : null
        }
      />

      <ReadyForAiCallout count={stats.readyForAi} assignments={readyAssignments} className="mb-8" />

      <StatRow stats={stats} />

      {/* The Paper Scanner, class heatmap, and conference briefs, one click from the dashboard. */}
      <TeachingTools briefClasses={briefClasses} className="mt-12" />

      {/* grid-cols-1 (minmax(0, 1fr)) keeps long card text from widening the column past a phone screen. */}
      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section aria-labelledby="classes-heading" className="min-w-0 lg:col-span-2">
          <SectionHeader
            id="classes-heading"
            title="Your classes"
            href={classes.length > 0 ? "/classes" : undefined}
            linkLabel="All classes"
          />
          {classes.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Create your first class to start grading."
              description="Add a class and its students, then set up an assignment with a rubric."
              action={
                <Button asChild>
                  <Link href="/classes">
                    Go to classes
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {classes.map((summary) => (
                <li key={summary.id} className="min-w-0">
                  <DashboardClassCard summary={summary} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="min-w-0 space-y-8">
          <RecentlyPublished items={recent} now={now} />
          {classes.length > 0 ? <MostMissedCard items={mostMissed} /> : null}
        </div>
      </div>
    </PageContainer>
  );
}
