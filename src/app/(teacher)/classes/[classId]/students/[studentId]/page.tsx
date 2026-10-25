import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ChartColumn, ChevronRight, Table2 } from "lucide-react";

import { ConferenceBriefCard } from "@/components/briefs/conference-brief-card";
import { EngagementCard } from "@/components/insights/engagement-card";
import { OpenWorkCard } from "@/components/insights/open-work-card";
import { PublishedGradesCard } from "@/components/insights/published-grades-card";
import { SkillsCard } from "@/components/insights/skills-card";
import { StudentStats } from "@/components/insights/student-stats";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AuthError, requireTeacherPage } from "@/lib/auth/session";
import { briefEngineInfo } from "@/lib/briefs/generate";
import { firstName } from "@/lib/format";
import { insightsHref } from "@/lib/insights/links";
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

  const now = new Date();
  const profile = buildStudentProfile(record, now);
  const engine = briefEngineInfo();
  const classTitle = [record.class.name, record.class.section].filter(Boolean).join(" · ");
  const classHref = `/classes/${encodeURIComponent(record.class.id)}`;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1">
            <Link
              href="/classes"
              className="shrink-0 rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              Classes
            </Link>
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
            <Link
              href={classHref}
              className="truncate rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              {record.class.name}
            </Link>
          </nav>
        }
        title={
          <span className="flex min-w-0 items-center gap-3">
            <Avatar name={record.student.name} className="size-10 text-sm" />
            <span className="min-w-0 break-words">{record.student.name}</span>
          </span>
        }
        description={
          <>
            {classTitle} · <span className="break-all">{record.student.email}</span>
          </>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={insightsHref(record.class.id)}>
                <ChartColumn aria-hidden />
                Class insights
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/gradebook?class=${encodeURIComponent(record.class.id)}`}>
                <Table2 aria-hidden />
                Gradebook
              </Link>
            </Button>
          </>
        }
      />

      <StudentStats profile={profile} assignmentCount={record.assignments.length} />

      {/* grid-cols-1 (minmax(0, 1fr)) keeps long text from widening the column past a phone screen. */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <ConferenceBriefCard
            classId={record.class.id}
            studentId={record.student.id}
            studentName={record.student.name}
            firstName={firstName(record.student.name)}
            classTitle={classTitle}
            publishedCount={profile.stats.publishedCount}
            engine={engine.engine}
            model={engine.model}
          />
          <PublishedGradesCard grades={profile.grades} />
        </div>
        <div className="min-w-0 space-y-6">
          <SkillsCard
            strengths={profile.strengths}
            growthAreas={profile.growthAreas}
            hasGrades={profile.grades.length > 0}
          />
          <OpenWorkCard items={profile.openWork} />
          <EngagementCard streak={profile.engagement.streak} level={profile.engagement.level} />
        </div>
      </div>
    </PageContainer>
  );
}
