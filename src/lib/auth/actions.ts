"use server";

import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { demoLoginEnabled, type Role } from "@/lib/constants";
import { DEMO_ACCOUNT_EMAILS, pickDemoAccount, setupIssueForError, type SetupIssue } from "@/lib/auth/demo-accounts";
import { clearSessionCookie, requireTeacher, setSessionCookie } from "@/lib/auth/session";

/**
 * Demo sign-in. Markwise ships with synthetic demo accounts only, so these
 * actions are the whole auth story for the hackathon. Roles are still
 * enforced server-side on every page, action, and route.
 */

/**
 * Sign in as the demo account for `role`, or send the visitor back to the
 * landing page with the reason it couldn't (see SetupIssue). Only reads the
 * database: a missing demo account is reported, never created.
 */
async function signInAsDemo(role: Role, home: string): Promise<never> {
  if (!demoLoginEnabled()) redirect("/");
  let account: { id: string } | null = null;
  let issue: SetupIssue | null = null;
  try {
    const rows = await db.user.findMany({
      where: { email: { in: [...DEMO_ACCOUNT_EMAILS[role]] } },
      select: { id: true, email: true, role: true },
    });
    account = pickDemoAccount(rows, role);
    // Every row belongs to a user, so no users means the demo data was never loaded.
    if (!account) issue = (await db.user.count()) === 0 ? "empty" : "no-demo";
  } catch (error) {
    issue = setupIssueForError(error);
    // The error class and Prisma's code only: never the connection string or query.
    const code = error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
    console.error("[markwise] Demo sign-in couldn't query the database", {
      type: error instanceof Error ? error.name : typeof error,
      code: typeof code === "string" ? code : null,
      issue,
    });
  }
  // Outside the try: redirect() works by throwing.
  if (!account) redirect(`/?setup=${issue ?? "no-demo"}`);
  await setSessionCookie(account.id);
  redirect(home);
}

export async function signInAsDemoTeacher() {
  await signInAsDemo("TEACHER", "/dashboard");
}

export async function signInAsDemoStudent() {
  await signInAsDemo("STUDENT", "/student");
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
