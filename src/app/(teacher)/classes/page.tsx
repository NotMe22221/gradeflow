import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { ClassCard, type ClassCardData } from "@/components/classes/class-card";
import { NewClassDialog } from "@/components/classes/new-class-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageContainer, PageHeader } from "@/components/page-header";
import { requireTeacherPage } from "@/lib/auth/session";
import { pluralize } from "@/lib/format";
import { getClassSummaries } from "@/lib/stats";

export const metadata: Metadata = { title: "Classes" };

export default async function ClassesPage() {
  const teacher = await requireTeacherPage();

  // Same per-class counts as the dashboard (review queue and READY_FOR_AI_STATUSES).
  const summaries = await getClassSummaries(teacher.id);
  const cards: ClassCardData[] = summaries.map((summary) => ({
    id: summary.id,
    name: summary.name,
    section: summary.section,
    subject: summary.subject,
    studentCount: summary.studentCount,
    assignmentCount: summary.assignmentCount,
    reviewCount: summary.pendingReview,
    readyCount: summary.readyForAi,
  }));

  const totalReview = cards.reduce((sum, card) => sum + card.reviewCount, 0);
  const description =
    cards.length === 0
      ? "Classes hold your roster and assignments."
      : totalReview > 0
        ? `${pluralize(totalReview, "paper")} waiting for your review across ${pluralize(cards.length, "class", "classes")}.`
        : `${pluralize(cards.length, "class", "classes")}. Nothing is waiting for your review.`;

  return (
    <PageContainer>
      <PageHeader title="Classes" description={description} actions={cards.length > 0 ? <NewClassDialog /> : null} />
      {cards.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Create your first class to start grading."
          description="Add a roster, write a rubric, and let the AI draft a first pass for you to review."
          action={<NewClassDialog />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <ClassCard key={card.id} data={card} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
