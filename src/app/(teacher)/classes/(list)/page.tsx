import type { Metadata } from "next";

import { BookOpen } from "@/components/icons";
import { ClassCard } from "@/components/classes/class-card";
import { NewClassDialog } from "@/components/classes/new-class-dialog";
import { EmptyState } from "@/components/empty-state";
import { ArrangeableClassGrid } from "@/components/layout-editor/arrangeable-class-grid";
import { CustomizeButton, FixedRegion, LayoutEditorProvider } from "@/components/layout-editor/editor-context";
import { PageContainer, PageHeader } from "@/components/page-header";
import { requireTeacherPage } from "@/lib/auth/session";
import { getUpcomingByClass } from "@/lib/classroom/stream";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";
import { pluralize } from "@/lib/format";
import { getPreferences } from "@/lib/preferences/server";
import { getClassSummaries } from "@/lib/stats";

export const metadata: Metadata = { title: "Classes" };

/** Every class as a card, in the teacher's own order (Arrange, or ?customize=1, to change it). */
export default async function ClassesPage({
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

  // Same per-class counts as Home (review queue and READY_FOR_AI_STATUSES).
  const [summaries, upcoming] = await Promise.all([
    getClassSummaries(teacher.id, now),
    getUpcomingByClass(teacher.id, now, 2, timeZone),
  ]);

  const totalReview = summaries.reduce((sum, summary) => sum + summary.pendingReview, 0);
  const description =
    summaries.length === 0
      ? "Classes hold your roster and assignments."
      : totalReview > 0
        ? `${pluralize(totalReview, "paper")} waiting for your review across ${pluralize(summaries.length, "class", "classes")}.`
        : `${pluralize(summaries.length, "class", "classes")}. Nothing is waiting for your review.`;

  return (
    <PageContainer>
      <LayoutEditorProvider
        classOrder={preferences.layout.classOrder}
        label="your classes"
        startEditing={params.customize === "1" && summaries.length > 1}
      >
        <FixedRegion>
          <PageHeader
            title="Classes"
            description={description}
            actions={
              summaries.length > 0 ? (
                <>
                  {summaries.length > 1 ? <CustomizeButton>Arrange</CustomizeButton> : null}
                  <NewClassDialog />
                </>
              ) : null
            }
          />
        </FixedRegion>
        <ArrangeableClassGrid
          label="Your classes"
          items={summaries.map((summary) => ({
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
              description="Add a roster, write a rubric, and let the AI draft a first pass for you to review."
              action={<NewClassDialog />}
              className="py-16"
            />
          }
        />
      </LayoutEditorProvider>
    </PageContainer>
  );
}
