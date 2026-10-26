import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StudentClassStreamView } from "@/components/student/class-stream";
import { requireStudentPage } from "@/lib/auth/session";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";

import { getEnrolledClass, loadStudentWork } from "../../data";

type Params = Promise<{ classId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const student = await requireStudentPage();
  const klass = await getEnrolledClass(student.id, (await params).classId);
  return { title: klass ? `${klass.name} · Stream` : "Class" };
}

/** The class Stream for the signed-in student: banner, their work due soon, and class activity. */
export default async function StudentClassStreamPage({ params }: { params: Params }) {
  const student = await requireStudentPage();
  const klass = await getEnrolledClass(student.id, (await params).classId);
  if (!klass) notFound();

  const now = new Date();
  const timeZone = await viewerTimeZone();
  // Scoped to this student's enrollment and their own submissions only.
  const { rows } = await loadStudentWork(student.id, now, { classId: klass.id, timeZone });

  return <StudentClassStreamView klass={klass} rows={rows} now={now} timeZone={timeZone} />;
}
