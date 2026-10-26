import { notFound } from "next/navigation";

import { ClassTabBar } from "@/components/classroom/class-tab-bar";
import { TeacherClassTabs } from "@/components/classroom/class-tabs";
import { getOwnedClass } from "@/lib/access";
import { AuthError, requireTeacherPage } from "@/lib/auth/session";

/** Every teacher class page shares the class name and the Stream / Classwork / People / Grades tabs. */
export default async function TeacherClassLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const teacher = await requireTeacherPage();
  let klass;
  try {
    klass = classId.length <= 64 ? await getOwnedClass(teacher.id, classId) : null;
  } catch (error) {
    if (error instanceof AuthError) klass = null;
    else throw error;
  }
  if (!klass) notFound();

  return (
    <>
      <ClassTabBar
        name={klass.name}
        section={klass.section}
        href={`/classes/${klass.id}`}
        tabs={<TeacherClassTabs classId={klass.id} />}
      />
      {children}
    </>
  );
}
