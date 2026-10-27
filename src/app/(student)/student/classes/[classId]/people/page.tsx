import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HeaderDecor, PageHeader } from "@/components/page-header";
import { StudentPeople } from "@/components/student/class-people";
import { requireStudentPage } from "@/lib/auth/session";

import { getEnrolledClass, loadClassmates } from "../../../data";

type Params = Promise<{ classId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const student = await requireStudentPage();
  const klass = await getEnrolledClass(student.id, (await params).classId);
  return { title: klass ? `${klass.name} · People` : "People" };
}

/** People for the signed-in student: the teacher and classmates, names only. */
export default async function StudentPeoplePage({ params }: { params: Params }) {
  const student = await requireStudentPage();
  const klass = await getEnrolledClass(student.id, (await params).classId);
  if (!klass) notFound();

  const classmates = await loadClassmates(student.id, klass.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader title={`People in ${klass.name}`} decor={<HeaderDecor tones={["coral", "sky"]} />} />
      <StudentPeople teacherName={klass.teacherName} classmates={classmates} />
    </div>
  );
}
