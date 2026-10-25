"use server";

import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { DEMO_STUDENT_EMAIL, DEMO_TEACHER_EMAIL, demoLoginEnabled } from "@/lib/constants";
import { clearSessionCookie, requireTeacher, setSessionCookie } from "@/lib/auth/session";

/**
 * Demo sign-in. GradeFlow ships with synthetic demo accounts only, so these
 * actions are the whole auth story for the hackathon. Roles are still
 * enforced server-side on every page, action, and route.
 */

export async function signInAsDemoTeacher() {
  if (!demoLoginEnabled()) redirect("/");
  const teacher = await db.user.findUnique({ where: { email: DEMO_TEACHER_EMAIL } });
  if (!teacher || teacher.role !== "TEACHER") redirect("/?setup=seed");
  await setSessionCookie(teacher.id);
  redirect("/dashboard");
}

export async function signInAsDemoStudent() {
  if (!demoLoginEnabled()) redirect("/");
  const student = await db.user.findUnique({ where: { email: DEMO_STUDENT_EMAIL } });
  if (!student || student.role !== "STUDENT") redirect("/?setup=seed");
  await setSessionCookie(student.id);
  redirect("/student");
}

/**
 * Demo account switcher: a teacher previews the student view as one of their
 * own enrolled students. Restricted to students in the teacher's classes.
 */
export async function viewAsStudent(studentId: string, assignmentId?: string) {
  if (!demoLoginEnabled()) redirect("/");
  const teacher = await requireTeacher();
  const enrollment = await db.enrollment.findFirst({
    where: { studentId, class: { teacherId: teacher.id }, student: { role: "STUDENT" } },
    select: { studentId: true },
  });
  if (!enrollment) redirect("/dashboard");
  await setSessionCookie(enrollment.studentId);
  if (assignmentId) {
    const visible = await db.assignment.findFirst({
      where: { id: assignmentId, class: { enrollments: { some: { studentId } } } },
      select: { id: true },
    });
    if (visible) redirect(`/student/assignments/${visible.id}`);
  }
  redirect("/student");
}

export async function signOut() {
  await clearSessionCookie();
  redirect("/");
}
