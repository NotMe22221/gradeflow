import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { ClassCard, ClassCardGrid } from "@/components/classes/class-card";
import { NewClassDialog } from "@/components/classes/new-class-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageContainer, PageHeader } from "@/components/page-header";
import { requireTeacherPage } from "@/lib/auth/session";
import { getUpcomingByClass } from "@/lib/classroom/stream";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";
import { pluralize } from "@/lib/format";
import { getClassSummaries } from "@/lib/stats";

export const metadata: Metadata = { title: "Classes" };

export default async function ClassesPage() {
  const teacher = await requireTeacherPage();
  const now = new Date();
  const timeZone = await viewerTimeZone();

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
      <PageHeader
        title="Classes"
        description={description}
        actions={summaries.length > 0 ? <NewClassDialog /> : null}
      />
      {summaries.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Create your first class to start grading."
          description="Add a roster, write a rubric, and let the AI draft a first pass for you to review."
          action={<NewClassDialog />}
          className="py-16"
        />
      ) : (
        <ClassCardGrid>
          {summaries.map((summary) => (
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
    </PageContainer>
  );
}
