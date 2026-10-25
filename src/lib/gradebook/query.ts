import "server-only";

import { getOwnedClass } from "@/lib/access";
import { db } from "@/lib/db";
import { buildGradebook, type GradebookClassOption, type GradebookData } from "@/lib/gradebook/types";

/** The teacher's classes for the gradebook switcher, oldest first. */
export async function listGradebookClasses(teacherId: string): Promise<GradebookClassOption[]> {
  return db.class.findMany({
    where: { teacherId },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
    select: { id: true, name: true, section: true },
  });
}

/**
 * The gradebook for one class the teacher owns. Throws AuthError(404) for a
 * class that does not exist or belongs to someone else.
 *
 * Scores are read from PublishedGrade only. The submission select below
 * deliberately never touches AiGrade or CriterionScore.
 */
export async function getGradebook(teacherId: string, classId: string): Promise<GradebookData> {
  const klass = await getOwnedClass(teacherId, classId);

  const [assignments, enrollments, submissions] = await Promise.all([
    db.assignment.findMany({
      where: { classId: klass.id },
      orderBy: [{ createdAt: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        dueDate: true,
        criteria: { select: { maxPoints: true } },
      },
    }),
    db.enrollment.findMany({
      where: { classId: klass.id },
      select: { student: { select: { id: true, name: true, email: true } } },
    }),
    db.submission.findMany({
      where: { assignment: { classId: klass.id } },
      select: {
        id: true,
        assignmentId: true,
        studentId: true,
        status: true,
        publishedGrade: { select: { totalScore: true, maxScore: true } },
      },
    }),
  ]);

  return buildGradebook({
    class: { id: klass.id, name: klass.name, section: klass.section },
    assignments,
    students: enrollments.map((enrollment) => enrollment.student),
    submissions,
  });
}
