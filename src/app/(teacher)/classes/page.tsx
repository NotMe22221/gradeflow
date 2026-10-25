import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { ClassCard, type ClassCardData } from "@/components/classes/class-card";
import { NewClassDialog } from "@/components/classes/new-class-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageContainer, PageHeader } from "@/components/page-header";
import { requireTeacherPage } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { pluralize } from "@/lib/format";

export const metadata: Metadata = { title: "Classes" };

export default async function ClassesPage() {
  const teacher = await requireTeacherPage();

  const [classes, backlog] = await Promise.all([
    db.class.findMany({
      where: { teacherId: teacher.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        section: true,
        subject: true,
        _count: { select: { enrollments: true, assignments: true } },
      },
    }),
    db.submission.findMany({
      where: {
        status: { in: ["NEEDS_REVIEW", "SUBMITTED", "GRADING_FAILED"] },
        assignment: { class: { teacherId: teacher.id } },
      },
      select: { status: true, assignment: { select: { classId: true } } },
    }),
  ]);

  const counts = new Map<string, { review: number; ready: number }>();
  for (const submission of backlog) {
    const entry = counts.get(submission.assignment.classId) ?? { review: 0, ready: 0 };
    if (submission.status === "NEEDS_REVIEW") entry.review++;
    else entry.ready++;
    counts.set(submission.assignment.classId, entry);
  }

  const cards: ClassCardData[] = classes.map((klass) => ({
    id: klass.id,
    name: klass.name,
    section: klass.section,
    subject: klass.subject,
    studentCount: klass._count.enrollments,
    assignmentCount: klass._count.assignments,
    reviewCount: counts.get(klass.id)?.review ?? 0,
    readyCount: counts.get(klass.id)?.ready ?? 0,
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
