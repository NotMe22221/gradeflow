import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageContainer, PageHeader } from "@/components/page-header";
import {
  ClassAssignmentsCard,
  type StudentAssignmentRow,
  type StudentClassGroup,
} from "@/components/student/class-assignments-card";
import { isPastDue, studentStateFor } from "@/components/student/student-status";
import { requireStudentPage } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { firstName, pluralize } from "@/lib/format";

export const metadata: Metadata = { title: "Your assignments" };

export default async function StudentHomePage() {
  const student = await requireStudentPage();
  const now = new Date();

  // Only this student's own submissions are loaded, and only the published
  // totals: no AI suggestion, confidence, or flag ever reaches this page.
  const enrollments = await db.enrollment.findMany({
    where: { studentId: student.id },
    orderBy: { class: { name: "asc" } },
    select: {
      class: {
        select: {
          id: true,
          name: true,
          section: true,
          subject: true,
          teacher: { select: { name: true } },
          assignments: {
            orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
            select: {
              id: true,
              title: true,
              dueDate: true,
              submissions: {
                where: { studentId: student.id },
                take: 1,
                select: {
                  status: true,
                  publishedGrade: { select: { totalScore: true, maxScore: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const groups: StudentClassGroup[] = enrollments.map(({ class: klass }) => ({
    id: klass.id,
    name: klass.name,
    meta: [klass.section, klass.subject].filter(Boolean).join(" · ") || null,
    teacherName: klass.teacher.name,
    assignments: klass.assignments.map((assignment): StudentAssignmentRow => {
      const submission = assignment.submissions[0];
      const published = submission?.publishedGrade ?? null;
      return {
        id: assignment.id,
        title: assignment.title,
        dueDate: assignment.dueDate,
        pastDue: isPastDue(assignment.dueDate, now),
        state: studentStateFor(submission?.status, published !== null),
        score: published ? { total: published.totalScore, max: published.maxScore } : null,
      };
    }),
  }));

  const rows = groups.flatMap((group) => group.assignments);
  const toSubmit = rows.filter((row) => row.state === "not_submitted").length;
  const toRevise = rows.filter((row) => row.state === "returned").length;
  const waiting = rows.filter((row) => row.state === "submitted").length;

  const greeting = `Hi ${firstName(student.name)}.`;
  let summary: string;
  if (groups.length === 0) {
    summary = "Your classes and assignments will show up here.";
  } else if (toSubmit > 0 || toRevise > 0) {
    const parts = [
      toSubmit > 0 ? `${pluralize(toSubmit, "assignment")} to submit` : null,
      toRevise > 0 ? `${pluralize(toRevise, "paper")} to revise` : null,
    ].filter(Boolean);
    summary = `You have ${parts.join(" and ")}.`;
  } else if (waiting > 0) {
    summary = "You're all caught up. Grades appear here once your teacher approves them.";
  } else {
    summary = "You're all caught up.";
  }

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Your assignments" description={`${greeting} ${summary}`} />

      {groups.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="You're not enrolled in any classes yet."
          description="When your teacher adds you to a class, its assignments will show up here."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <ClassAssignmentsCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
