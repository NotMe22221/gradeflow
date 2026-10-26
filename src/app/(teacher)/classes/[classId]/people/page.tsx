import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { StudentsSection, TeachersSection } from "@/components/classes/people-list";
import { getOwnedClass } from "@/lib/access";
import { AuthError, requireTeacherPage } from "@/lib/auth/session";
import { db } from "@/lib/db";

type Params = Promise<{ classId: string }>;

/** The teacher and their own class, or null. Cached so metadata and page share one lookup. */
const loadOwnedClass = cache(async (classId: string) => {
  const teacher = await requireTeacherPage();
  if (classId.length > 64) return null;
  try {
    return { teacher, klass: await getOwnedClass(teacher.id, classId) };
  } catch (error) {
    if (error instanceof AuthError) return null;
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const owned = await loadOwnedClass((await params).classId);
  return { title: owned ? `${owned.klass.name} · People` : "People" };
}

/** Classroom's People tab: the teacher, then the roster with "Add student". */
export default async function ClassPeoplePage({ params }: { params: Params }) {
  const owned = await loadOwnedClass((await params).classId);
  if (!owned) notFound();
  const { teacher, klass } = owned;

  const enrollments = await db.enrollment.findMany({
    where: { classId: klass.id, class: { teacherId: teacher.id } },
    orderBy: { student: { name: "asc" } },
    select: { student: { select: { id: true, name: true } } },
  });
  const students = enrollments.map((enrollment) => enrollment.student);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Same wording as the student People page; the tab bar's class name is a link, not a heading. */}
      <h1 className="sr-only">People in {klass.name}</h1>
      <TeachersSection teacherName={teacher.name} />
      <StudentsSection classId={klass.id} classTitle={klass.name} students={students} className="mt-10" />
    </div>
  );
}
