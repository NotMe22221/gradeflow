import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { StudentProfileView } from "@/components/insights/student-profile-view";
import { AuthError, requireTeacherPage } from "@/lib/auth/session";
import { briefEngineInfo } from "@/lib/briefs/generate";
import { buildStudentProfile } from "@/lib/insights/profile";
import { getStudentRecord } from "@/lib/insights/student";
import { idSchema } from "@/lib/validation/id";

type Params = Promise<{ classId: string; studentId: string }>;

/**
 * The student's record in a class the teacher owns, or null when the class is
 * not theirs or the student is not enrolled. Cached so metadata and the page
 * share one lookup.
 */
const loadStudentRecord = cache(async (classId: string, studentId: string) => {
  const teacher = await requireTeacherPage();
  const classParsed = idSchema.safeParse(classId);
  const studentParsed = idSchema.safeParse(studentId);
  if (!classParsed.success || !studentParsed.success) return null;
  try {
    return await getStudentRecord(teacher.id, classParsed.data, studentParsed.data);
  } catch (error) {
    if (error instanceof AuthError) return null;
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { classId, studentId } = await params;
  const record = await loadStudentRecord(classId, studentId);
  return { title: record ? `${record.student.name} · ${record.class.name}` : "Student" };
}

export default async function StudentProfilePage({ params }: { params: Params }) {
  const { classId, studentId } = await params;
  const record = await loadStudentRecord(classId, studentId);
  if (!record) notFound();

  const profile = buildStudentProfile(record, new Date());

  return <StudentProfileView record={record} profile={profile} engine={briefEngineInfo()} />;
}
