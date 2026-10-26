import "server-only";

import type { SessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getPreferences } from "@/lib/preferences/server";
import { orderByIds } from "@/lib/preferences/schema";
import {
  buildSearchIndex,
  MAX_SEARCH_ASSIGNMENTS,
  MAX_SEARCH_CLASSES,
  MAX_SEARCH_STUDENTS,
} from "@/lib/search/scope";
import type { SearchIndex } from "@/lib/search/types";

const CLASS_FIELDS = { id: true, name: true, section: true, subject: true } as const;
const ASSIGNMENT_FIELDS = { id: true, title: true, classId: true, kind: true, dueDate: true } as const;

/**
 * The search index for a signed-in user, scoped in the query itself:
 *
 * - Teacher: classes they teach, those classes' assignments, and the students
 *   enrolled in them (id and name only, per class).
 * - Student: classes they are enrolled in and those classes' assignments.
 *   No other students, ever.
 *
 * Only names, titles, kinds and due dates are read: no emails, submissions,
 * scores, AI drafts or flags. buildSearchIndex() re-checks the scope and
 * whitelists the fields. Classes follow the user's saved class order.
 */
export async function loadSearchIndex(user: SessionUser): Promise<SearchIndex> {
  const preferences = await getPreferences(user.id);

  if (user.role === "TEACHER") {
    const classes = await db.class.findMany({
      where: { teacherId: user.id },
      orderBy: { createdAt: "asc" },
      select: CLASS_FIELDS,
      take: MAX_SEARCH_CLASSES,
    });
    const classIds = classes.map((klass) => klass.id);
    const [assignments, enrollments] = await Promise.all([
      db.assignment.findMany({
        where: { classId: { in: classIds }, class: { teacherId: user.id } },
        orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
        select: ASSIGNMENT_FIELDS,
        take: MAX_SEARCH_ASSIGNMENTS,
      }),
      db.enrollment.findMany({
        where: { classId: { in: classIds }, class: { teacherId: user.id }, student: { role: "STUDENT" } },
        orderBy: { student: { name: "asc" } },
        select: { classId: true, student: { select: { id: true, name: true } } },
        take: MAX_SEARCH_STUDENTS,
      }),
    ]);
    return buildSearchIndex("TEACHER", {
      classes: orderByIds(classes, preferences.layout.classOrder),
      assignments,
      students: enrollments.map((enrollment) => ({
        id: enrollment.student.id,
        name: enrollment.student.name,
        classId: enrollment.classId,
      })),
    });
  }

  const enrollments = await db.enrollment.findMany({
    where: { studentId: user.id },
    orderBy: { class: { createdAt: "asc" } },
    select: { class: { select: CLASS_FIELDS } },
    take: MAX_SEARCH_CLASSES,
  });
  const classes = enrollments.map((enrollment) => enrollment.class);
  const assignments = await db.assignment.findMany({
    where: {
      classId: { in: classes.map((klass) => klass.id) },
      class: { enrollments: { some: { studentId: user.id } } },
    },
    orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    select: ASSIGNMENT_FIELDS,
    take: MAX_SEARCH_ASSIGNMENTS,
  });
  return buildSearchIndex("STUDENT", {
    classes: orderByIds(classes, preferences.layout.classOrder),
    assignments,
  });
}
