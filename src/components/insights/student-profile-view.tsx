import Link from "next/link";
import { ChartColumn, Table2 } from "lucide-react";

import { ConferenceBriefCard } from "@/components/briefs/conference-brief-card";
import { ClassAvatar } from "@/components/classroom/class-avatar";
import { EngagementCard } from "@/components/insights/engagement-card";
import { OpenWorkCard } from "@/components/insights/open-work-card";
import { PublishedGradesCard } from "@/components/insights/published-grades-card";
import { SkillsCard } from "@/components/insights/skills-card";
import { StudentStats } from "@/components/insights/student-stats";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { BriefEngine } from "@/lib/briefs/types";
import { firstName } from "@/lib/format";
import { insightsHref } from "@/lib/insights/links";
import type { StudentProfile, StudentRecord } from "@/lib/insights/profile";
import { classTheme } from "@/lib/ui/class-theme";

/**
 * A student's page inside a class (presentation only; the page loads the
 * data). It sits under the class tab bar with People active, so there is no
 * breadcrumb: a large avatar with the name and class, the stat strip, the
 * conference brief and returned grades, then strengths, open work, and
 * engagement in the side column.
 */
export function StudentProfileView({
  record,
  profile,
  engine,
}: {
  record: StudentRecord;
  profile: StudentProfile;
  /** The engine a new brief would use right now (no secrets). */
  engine: { engine: BriefEngine; model: string | null };
}) {
  const classTitle = [record.class.name, record.class.section].filter(Boolean).join(" · ");
  const classColor = classTheme(record.class).color;
  const testAssignmentIds = record.assignments.filter((a) => a.kind === "TEST").map((a) => a.id);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <Avatar
            name={record.student.name}
            className="size-16 bg-primary-soft font-display text-xl font-medium text-primary-soft-foreground ring-0 sm:size-20 sm:text-2xl"
          />
          <div className="min-w-0">
            <h1 className="text-[26px] leading-tight font-medium break-words text-foreground sm:text-[28px]">
              {record.student.name}
            </h1>
            <p className="mt-1.5 flex min-w-0 items-center gap-2 text-[15px] text-muted-foreground">
              <ClassAvatar name={record.class.name} className="size-5 text-[10px]" />
              <span className="truncate">{classTitle}</span>
            </p>
            <p className="mt-0.5 text-sm break-all text-muted-foreground">{record.student.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:justify-end">
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
        </div>
      </header>

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
          <PublishedGradesCard grades={profile.grades} classColor={classColor} testAssignmentIds={testAssignmentIds} />
        </div>
        <div className="min-w-0 space-y-6">
          <SkillsCard
            strengths={profile.strengths}
            growthAreas={profile.growthAreas}
            hasGrades={profile.grades.length > 0}
          />
          <OpenWorkCard items={profile.openWork} classColor={classColor} testAssignmentIds={testAssignmentIds} />
          <EngagementCard streak={profile.engagement.streak} level={profile.engagement.level} />
        </div>
      </div>
    </div>
  );
}
