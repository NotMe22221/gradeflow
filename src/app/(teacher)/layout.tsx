import { cookies } from "next/headers";

import { AppShell } from "@/components/app-shell/app-shell";
import { NAV_COLLAPSED_COOKIE } from "@/components/app-shell/nav-model";
import { getEngineStatus } from "@/lib/ai/engines";
import { requireTeacherPage } from "@/lib/auth/session";
import { demoLoginEnabled } from "@/lib/constants";
import { db } from "@/lib/db";
import { orderByIds } from "@/lib/preferences/schema";
import { getPreferences } from "@/lib/preferences/server";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireTeacherPage();

  const [reviewCount, classes, enrollments, preferences, cookieStore] = await Promise.all([
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
    getPreferences(user.id),
    cookies(),
  ]);

  const students = Array.from(new Map(enrollments.map((e) => [e.student.id, e.student])).values());

  return (
    <AppShell
      user={user}
      nav="teacher"
      counts={{ review: reviewCount }}
      // The drawer lists classes in the order the teacher arranged their class cards.
      classes={orderByIds(classes, preferences.layout.classOrder)}
      classesLabel="Teaching"
      classHrefBase="/classes/"
      homeHref="/dashboard"
      engines={getEngineStatus()}
      students={students}
      demoLogin={demoLoginEnabled()}
      preferences={preferences}
      initialCollapsed={cookieStore.get(NAV_COLLAPSED_COOKIE)?.value === "1"}
    >
      {children}
    </AppShell>
  );
}
