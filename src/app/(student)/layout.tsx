import { cookies } from "next/headers";

import { AppShell } from "@/components/app-shell/app-shell";
import { NAV_COLLAPSED_COOKIE } from "@/components/app-shell/nav-model";
import { isAwaitingScan, studentStateFor } from "@/components/student/student-status";
import { todoTabFor } from "@/components/student/todo-model";
import { requireStudentPage } from "@/lib/auth/session";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";
import { demoLoginEnabled, parseAssignmentKind } from "@/lib/constants";
import { db } from "@/lib/db";
import { orderByIds } from "@/lib/preferences/schema";
import { getPreferences } from "@/lib/preferences/server";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStudentPage();

  const [enrollments, preferences, cookieStore] = await Promise.all([
    db.enrollment.findMany({
      where: { studentId: user.id },
      orderBy: { class: { createdAt: "asc" } },
      select: { class: { select: { id: true, name: true, section: true } } },
    }),
    getPreferences(user.id),
    cookies(),
  ]);

  // To-do count: the same rule as the To-do page (Assigned + Missing), so the
  // badge and the page always agree. Includes papers sent back for revision;
  // a paper test waiting for its scan is with the teacher, not here.
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
  // "Today" in the viewer's zone, as on the To-do page (the shared past-due rule).
  const now = new Date();
  const timeZone = await viewerTimeZone();
  const todo = assignments.filter((assignment) => {
    const submission = assignment.submissions[0];
    const state = studentStateFor(submission?.status, Boolean(submission?.publishedGrade));
    const awaitingScan = isAwaitingScan(parseAssignmentKind(assignment.kind), state, assignment.dueDate, now, timeZone);
    return todoTabFor({ state, awaitingScan, pastDue: false }) !== "done";
  }).length;

  const classes = orderByIds(
    enrollments.map((enrollment) => enrollment.class),
    preferences.layout.classOrder
  );
  // Goals opens the goal planner on Home, which exists only with classes and while it isn't hidden.
  const showGoals = classes.length > 0 && !preferences.layout.studentHome.hidden.includes("planner");

  return (
    <AppShell
      user={user}
      nav="student"
      counts={{ todo }}
      classes={classes}
      classesLabel="Enrolled"
      classHrefBase="/student/classes/"
      homeHref="/student"
      demoLogin={demoLoginEnabled()}
      preferences={preferences}
      initialCollapsed={cookieStore.get(NAV_COLLAPSED_COOKIE)?.value === "1"}
      showGoals={showGoals}
    >
      {children}
    </AppShell>
  );
}
