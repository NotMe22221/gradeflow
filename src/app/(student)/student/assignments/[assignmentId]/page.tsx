import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { StudentAssignmentView } from "@/components/student/assignment-view";
import { getEnrolledAssignment } from "@/lib/access";
import { AuthError, requireStudentPage } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { idSchema } from "@/lib/validation/id";

type PageProps = { params: Promise<{ assignmentId: string }> };

/** Shared by generateMetadata and the page; enrollment is checked once per request. */
const loadEnrolledAssignment = cache(async (assignmentId: string) => {
  const student = await requireStudentPage();
  const id = idSchema.safeParse(assignmentId);
  if (!id.success) notFound();
  let assignment: Awaited<ReturnType<typeof getEnrolledAssignment>>;
  try {
    assignment = await getEnrolledAssignment(student.id, id.data);
  } catch (error) {
    if (error instanceof AuthError) notFound();
    throw error;
  }
  return { student, assignment };
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { assignmentId } = await params;
  const { assignment } = await loadEnrolledAssignment(assignmentId);
  return { title: assignment.title };
}

export default async function StudentAssignmentPage({ params }: PageProps) {
  const { assignmentId } = await params;
  const { student, assignment } = await loadEnrolledAssignment(assignmentId);

  // Only the signed-in student's own submission, and only fields a student may
  // see. AiGrade, CriterionScore, and draft review state are never selected.
  const [submission, teacher] = await Promise.all([
    db.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
      select: {
        content: true,
        fileName: true,
        source: true,
        submittedAt: true,
        status: true,
        returnNote: true,
        returnedAt: true,
        publishedGrade: {
          select: {
            totalScore: true,
            maxScore: true,
            breakdown: true,
            feedback: true,
            approvedAt: true,
            approvedBy: { select: { name: true } },
          },
        },
      },
    }),
    db.user.findUnique({ where: { id: assignment.class.teacherId }, select: { name: true } }),
  ]);

  return (
    <StudentAssignmentView
      assignment={{
        id: assignment.id,
        title: assignment.title,
        instructions: assignment.instructions,
        kind: assignment.kind,
        dueDate: assignment.dueDate,
        createdAt: assignment.createdAt,
        criteria: assignment.criteria.map(({ id, title, description, maxPoints }) => ({
          id,
          title,
          description,
          maxPoints,
        })),
        class: { id: assignment.class.id, name: assignment.class.name, section: assignment.class.section },
      }}
      teacherName={teacher?.name ?? null}
      submission={submission}
      now={new Date()}
    />
  );
}
