import type { Metadata } from "next";
import Link from "next/link";
import { Camera } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageContainer, PageHeader } from "@/components/page-header";
import { ScanEngineBadge } from "@/components/scan/engine-badge";
import { ScanWorkspace } from "@/components/scan/scan-workspace";
import {
  paperKey,
  type ScanAssignmentOption,
  type ScanClassOption,
  type ScanPaperState,
} from "@/components/scan/types";
import { Button } from "@/components/ui/button";
import { openAiConfigured } from "@/lib/ai/openai";
import { requireTeacherPage } from "@/lib/auth/session";
import { parseAssignmentKind, type SubmissionStatus } from "@/lib/constants";
import { db } from "@/lib/db";
import { TEACHER_REPLACEABLE_STATUSES } from "@/lib/submissions";

export const metadata: Metadata = { title: "Paper Scanner" };

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  GRADING: "Being graded",
  GRADING_FAILED: "AI pass failed",
  NEEDS_REVIEW: "In review",
  APPROVED: "Published",
  RETURNED: "Sent back",
  PUBLISHED: "Published",
};

function single(value: string | string[] | undefined): string {
  const first = Array.isArray(value) ? value[0] : value;
  return first && first.length <= 64 ? first : "";
}

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const teacher = await requireTeacherPage();
  const params = await searchParams;

  const [classRows, submissions] = await Promise.all([
    db.class.findMany({
      where: { teacherId: teacher.id },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        section: true,
        enrollments: {
          where: { student: { role: "STUDENT" } },
          orderBy: { student: { name: "asc" } },
          select: { student: { select: { id: true, name: true } } },
        },
        assignments: {
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true, kind: true, criteria: { select: { maxPoints: true } } },
        },
      },
    }),
    db.submission.findMany({
      where: { assignment: { class: { teacherId: teacher.id } } },
      select: { assignmentId: true, studentId: true, status: true },
    }),
  ]);

  const classes: ScanClassOption[] = classRows.map((klass) => ({
    id: klass.id,
    label: [klass.name, klass.section].filter(Boolean).join(" · "),
    students: klass.enrollments.map((enrollment) => enrollment.student),
  }));

  // Handwritten tests first within each class, then the newest assignments.
  const assignments: ScanAssignmentOption[] = classRows.flatMap((klass) =>
    klass.assignments
      .map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        kind: parseAssignmentKind(assignment.kind),
        classId: klass.id,
        questionCount: assignment.criteria.length,
        totalPoints: assignment.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0),
      }))
      .sort((a, b) => Number(b.kind === "TEST") - Number(a.kind === "TEST"))
  );

  const papers: Record<string, ScanPaperState> = {};
  for (const submission of submissions) {
    papers[paperKey(submission.assignmentId, submission.studentId)] = {
      status: submission.status,
      label: STATUS_LABELS[submission.status] ?? "Submitted",
      replaceable: TEACHER_REPLACEABLE_STATUSES.includes(submission.status as SubmissionStatus),
    };
  }

  // Only preselect what this teacher owns: an assignment from their classes,
  // and a student enrolled in that assignment's class.
  const requestedAssignment = assignments.find((assignment) => assignment.id === single(params.assignment));
  const requestedStudent = requestedAssignment
    ? classes
        .find((klass) => klass.id === requestedAssignment.classId)
        ?.students.find((student) => student.id === single(params.student))
    : undefined;

  const visionEnabled = openAiConfigured();

  return (
    <PageContainer>
      <PageHeader
        title="Paper Scanner"
        description="Photograph a handwritten test. GPT-4o reads it and drafts scores against your answer key. Nothing publishes until you approve it."
        actions={<ScanEngineBadge visionEnabled={visionEnabled} />}
      />
      {assignments.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="Create a test to scan into"
          description="Scanned tests are graded against an assignment's answer key. Create a handwritten test from one of your classes first."
          action={
            <Button asChild>
              <Link href="/classes">Go to classes</Link>
            </Button>
          }
        />
      ) : (
        <ScanWorkspace
          classes={classes}
          assignments={assignments}
          papers={papers}
          visionEnabled={visionEnabled}
          initialAssignmentId={requestedAssignment?.id ?? ""}
          initialStudentId={requestedStudent?.id ?? ""}
        />
      )}
    </PageContainer>
  );
}
