import "server-only";

import { getOwnedClass } from "@/lib/access";
import { AuthError } from "@/lib/auth/session";
import { parseAssignmentKind } from "@/lib/constants";
import { db } from "@/lib/db";
import { parseBreakdown } from "@/lib/grades/breakdown";
import type { StudentRecord } from "@/lib/insights/profile";

/** Cap on activity rows read for the streak and level (years of daily use). */
const MAX_ACTIVITY_ROWS = 5000;

/**
 * Everything the student page and the conference brief need about one
 * student in one class the teacher owns.
 *
 * Throws AuthError(404) when the class is not the teacher's or the student is
 * not enrolled in it. Scores come only from PublishedGrade; the submission
 * select deliberately never touches AiGrade, CriterionScore, or the paper.
 */
export async function getStudentRecord(teacherId: string, classId: string, studentId: string): Promise<StudentRecord> {
  const klass = await getOwnedClass(teacherId, classId);

  const enrollment = await db.enrollment.findUnique({
    where: { classId_studentId: { classId: klass.id, studentId } },
    select: { student: { select: { id: true, name: true, email: true, role: true } } },
  });
  if (!enrollment || enrollment.student.role !== "STUDENT") throw new AuthError("Student not found.", 404);
  const student = enrollment.student;

  const [assignments, submissions, activity] = await Promise.all([
    db.assignment.findMany({
      where: { classId: klass.id },
      orderBy: [{ createdAt: "asc" }, { title: "asc" }],
      select: { id: true, title: true, kind: true, dueDate: true, criteria: { select: { maxPoints: true } } },
    }),
    db.submission.findMany({
      where: { studentId: student.id, assignment: { classId: klass.id } },
      select: {
        id: true,
        assignmentId: true,
        status: true,
        updatedAt: true,
        publishedGrade: {
          select: { totalScore: true, maxScore: true, breakdown: true, feedback: true, publishedAt: true },
        },
      },
    }),
    db.studyActivity.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      take: MAX_ACTIVITY_ROWS,
      // kind: a published grade earns XP but is not a study day (see streakDates()).
      select: { createdAt: true, xp: true, kind: true },
    }),
  ]);

  return {
    class: { id: klass.id, name: klass.name, section: klass.section, subject: klass.subject },
    student: { id: student.id, name: student.name, email: student.email },
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      kind: parseAssignmentKind(assignment.kind),
      dueDate: assignment.dueDate,
      maxScore: assignment.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0),
    })),
    submissions: submissions.map((submission) => ({
      id: submission.id,
      assignmentId: submission.assignmentId,
      status: submission.status,
      updatedAt: submission.updatedAt,
      published: submission.publishedGrade
        ? {
            totalScore: submission.publishedGrade.totalScore,
            maxScore: submission.publishedGrade.maxScore,
            breakdown: parseBreakdown(submission.publishedGrade.breakdown),
            feedback: submission.publishedGrade.feedback,
            publishedAt: submission.publishedGrade.publishedAt,
          }
        : null,
    })),
    activity,
  };
}
