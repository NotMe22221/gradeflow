import { AppShell } from "@/components/app-shell/app-shell";
import { requireStudentPage } from "@/lib/auth/session";
import { demoLoginEnabled } from "@/lib/constants";
import { db } from "@/lib/db";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStudentPage();

  const enrollments = await db.enrollment.findMany({
    where: { studentId: user.id },
    orderBy: { class: { createdAt: "asc" } },
    select: { class: { select: { id: true, name: true, section: true } } },
  });

  // To-do count: assignments in the student's classes with nothing turned in yet.
  const todo = await db.assignment.count({
    where: {
      class: { enrollments: { some: { studentId: user.id } } },
      kind: { not: "TEST" },
      submissions: { none: { studentId: user.id } },
    },
  });

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
