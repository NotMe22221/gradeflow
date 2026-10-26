import { AppShell } from "@/components/app-shell/app-shell";
import { isAwaitingScan, studentStateFor } from "@/components/student/student-status";
import { todoTabFor } from "@/components/student/todo-model";
import { requireStudentPage } from "@/lib/auth/session";
import { demoLoginEnabled, parseAssignmentKind } from "@/lib/constants";
import { db } from "@/lib/db";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStudentPage();

  const enrollments = await db.enrollment.findMany({
    where: { studentId: user.id },
    orderBy: { class: { createdAt: "asc" } },
    select: { class: { select: { id: true, name: true, section: true } } },
  });

  // To-do count: the same rule as the To-do page (Assigned + Missing), so the
  // drawer badge and the page always agree. Includes papers sent back for
  // revision; a paper test waiting for its scan is with the teacher, not here.
  const assignments = await db.assignment.findMany({
    where: { class: { enrollments: { some: { studentId: user.id } } } },
    select: {
      kind: true,
      dueDate: true,
      submissions: {
        where: { studentId: user.id },
        take: 1,
        select: { status: true, publishedGrade: { select: { publishedAt: true } } },
      },
    },
  });
  const now = new Date();
  const todo = assignments.filter((assignment) => {
    const submission = assignment.submissions[0];
    const state = studentStateFor(submission?.status, Boolean(submission?.publishedGrade));
    const awaitingScan = isAwaitingScan(parseAssignmentKind(assignment.kind), state, assignment.dueDate, now);
    return todoTabFor({ state, awaitingScan, pastDue: false }) !== "done";
  }).length;

  return (
    <AppShell
      user={user}
      nav="student"
      counts={{ todo }}
      classes={enrollments.map((enrollment) => enrollment.class)}
      classesLabel="Enrolled"
      classesHref="/student"
      classHrefBase="/student/classes/"
      homeHref="/student"
      demoLogin={demoLoginEnabled()}
    >
      {children}
    </AppShell>
  );
}
