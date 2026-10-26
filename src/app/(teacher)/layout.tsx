import { AppShell } from "@/components/app-shell/app-shell";
import { getEngineStatus } from "@/lib/ai/engines";
import { requireTeacherPage } from "@/lib/auth/session";
import { demoLoginEnabled } from "@/lib/constants";
import { db } from "@/lib/db";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireTeacherPage();

  const [reviewCount, classes, enrollments] = await Promise.all([
    db.submission.count({
      where: { status: "NEEDS_REVIEW", assignment: { class: { teacherId: user.id } } },
    }),
    db.class.findMany({
      where: { teacherId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, section: true },
    }),
    db.enrollment.findMany({
      where: { class: { teacherId: user.id } },
      select: { student: { select: { id: true, name: true } } },
      orderBy: { student: { name: "asc" } },
    }),
  ]);

  const students = Array.from(new Map(enrollments.map((e) => [e.student.id, e.student])).values());

  return (
    <AppShell
      user={user}
      nav="teacher"
      counts={{ review: reviewCount }}
      classes={classes}
      classesLabel="Teaching"
      classesHref="/classes"
      classHrefBase="/classes/"
      homeHref="/dashboard"
      engines={getEngineStatus()}
      students={students}
      demoLogin={demoLoginEnabled()}
    >
      {children}
    </AppShell>
  );
}
