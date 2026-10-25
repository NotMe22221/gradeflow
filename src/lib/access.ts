import "server-only";

import { db } from "@/lib/db";
import { AuthError } from "@/lib/auth/session";

/**
 * Ownership checks. Every teacher-side read or write of a class, assignment,
 * or submission goes through one of these so a teacher can only ever touch
 * their own classes, regardless of what ids the client sends.
 */

export async function getOwnedClass(teacherId: string, classId: string) {
  const klass = await db.class.findFirst({ where: { id: classId, teacherId } });
  if (!klass) throw new AuthError("Class not found.", 404);
  return klass;
}

export async function getOwnedAssignment(teacherId: string, assignmentId: string) {
  const assignment = await db.assignment.findFirst({
    where: { id: assignmentId, class: { teacherId } },
    include: { criteria: { orderBy: { position: "asc" } }, class: true },
  });
  if (!assignment) throw new AuthError("Assignment not found.", 404);
  return assignment;
}

export async function getOwnedSubmission(teacherId: string, submissionId: string) {
  const submission = await db.submission.findFirst({
    where: { id: submissionId, assignment: { class: { teacherId } } },
    include: {
      assignment: { include: { criteria: { orderBy: { position: "asc" } }, class: true } },
      student: { select: { id: true, name: true, email: true } },
    },
  });
  if (!submission) throw new AuthError("Submission not found.", 404);
  return submission;
}

/** A student may only see assignments for classes they are enrolled in. */
export async function getEnrolledAssignment(studentId: string, assignmentId: string) {
  const assignment = await db.assignment.findFirst({
    where: { id: assignmentId, class: { enrollments: { some: { studentId } } } },
    include: { criteria: { orderBy: { position: "asc" } }, class: true },
  });
  if (!assignment) throw new AuthError("Assignment not found.", 404);
  return assignment;
}
