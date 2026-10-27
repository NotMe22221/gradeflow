import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-header";
import { StudentClasswork } from "@/components/student/class-classwork";
import { requireStudentPage } from "@/lib/auth/session";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";
import { classTheme } from "@/lib/ui/class-theme";

import { getEnrolledClass, loadStudentWork } from "../../../data";

type Params = Promise<{ classId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const student = await requireStudentPage();
  const klass = await getEnrolledClass(student.id, (await params).classId);
  return { title: klass ? `${klass.name} · Classwork` : "Classwork" };
}

/** Classwork for the signed-in student: every assignment in the class with their own status. */
export default async function StudentClassworkPage({ params }: { params: Params }) {
  const student = await requireStudentPage();
  const klass = await getEnrolledClass(student.id, (await params).classId);
  if (!klass) notFound();

  const now = new Date();
  const timeZone = await viewerTimeZone();
  const { rows } = await loadStudentWork(student.id, now, { classId: klass.id, timeZone });

  return (
    // overflow-y-clip: the title's paint tucks under the class tab bar instead of showing through it.
    <PageContainer className="max-w-5xl overflow-y-clip">
      <StudentClasswork classId={klass.id} classColor={classTheme(klass).color} rows={rows} now={now} timeZone={timeZone} />
    </PageContainer>
  );
}
