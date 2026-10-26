import { notFound } from "next/navigation";

import { ClassTabBar } from "@/components/classroom/class-tab-bar";
import { StudentClassTabs } from "@/components/classroom/class-tabs";
import { requireStudentPage } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { idSchema } from "@/lib/validation/id";

/** Every student class page shares the class name and the Stream / Classwork / People tabs. */
export default async function StudentClassLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const student = await requireStudentPage();
  const id = idSchema.safeParse(classId);
  const klass = id.success
    ? await db.class.findFirst({
        where: { id: id.data, enrollments: { some: { studentId: student.id } } },
        select: { id: true, name: true, section: true },
      })
    : null;
  if (!klass) notFound();

  return (
    <>
      <ClassTabBar
        name={klass.name}
        section={klass.section}
        href={`/student/classes/${klass.id}`}
        tabs={<StudentClassTabs classId={klass.id} />}
      />
      {children}
    </>
  );
}
