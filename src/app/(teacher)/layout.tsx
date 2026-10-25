import { AppShell } from "@/components/app-shell/app-shell";
import { requireTeacherPage } from "@/lib/auth/session";
import { demoLoginEnabled } from "@/lib/constants";
import { db } from "@/lib/db";
import { getEngineStatus } from "@/lib/ai/engines";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireTeacherPage();

  const [reviewCount, enrollments] = await Promise.all([
    db.submission.count({
      where: { status: "NEEDS_REVIEW", assignment: { class: { teacherId: user.id } } },
    }),
    db.enrollment.findMany({
      where: { class: { teacherId: user.id } },
      select: { student: { select: { id: true, name: true } } },
      orderBy: { student: { name: "asc" } },
    }),
  ]);

  const students = Array.from(
    new Map(enrollments.map((e) => [e.student.id, e.student])).values()
  );

  return (
    <AppShell
      user={user}
      engines={getEngineStatus()}
      counts={{ review: reviewCount }}
      students={students}
      demoLogin={demoLoginEnabled()}
    >
      {children}
    </AppShell>
  );
}
