import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Camera, ChevronRight, Plus, Table2 } from "lucide-react";

import { AssignmentList, type AssignmentListItem } from "@/components/classes/assignment-list";
import { RosterCard } from "@/components/classes/roster-card";
import { summarizeStatuses } from "@/components/classes/status-summary";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getOwnedClass } from "@/lib/access";
import { AuthError, requireTeacherPage } from "@/lib/auth/session";
import { parseAssignmentKind } from "@/lib/constants";
import { db } from "@/lib/db";

type Params = Promise<{ classId: string }>;

/** The teacher's own class, or null. Cached so metadata and page share one lookup. */
const loadOwnedClass = cache(async (classId: string) => {
  const teacher = await requireTeacherPage();
  if (classId.length > 64) return null;
  try {
    return await getOwnedClass(teacher.id, classId);
  } catch (error) {
    if (error instanceof AuthError) return null;
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const klass = await loadOwnedClass((await params).classId);
  return { title: klass?.name ?? "Class" };
}

export default async function ClassPage({ params }: { params: Params }) {
  const klass = await loadOwnedClass((await params).classId);
  if (!klass) notFound();

  const [assignments, enrollments] = await Promise.all([
    db.assignment.findMany({
      where: { classId: klass.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        kind: true,
        dueDate: true,
        criteria: { select: { maxPoints: true } },
        submissions: { select: { status: true } },
      },
    }),
    db.enrollment.findMany({
      where: { classId: klass.id },
      orderBy: { student: { name: "asc" } },
      select: { student: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const students = enrollments.map((enrollment) => enrollment.student);
  const items: AssignmentListItem[] = assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    isTest: parseAssignmentKind(assignment.kind) === "TEST",
    dueDate: assignment.dueDate,
    totalPoints: assignment.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0),
    criteriaCount: assignment.criteria.length,
    summary: summarizeStatuses(
      assignment.submissions.map((submission) => submission.status),
      students.length
    ),
  }));

  const details = [klass.section, klass.subject].filter(Boolean).join(" · ");

  return (
    <PageContainer>
      <PageHeader
        eyebrow={
          <span className="flex min-w-0 items-center gap-1">
            <Link
              href="/classes"
              className="rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              Classes
            </Link>
            {details ? (
              <>
                <ChevronRight className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{details}</span>
              </>
            ) : null}
          </span>
        }
        title={klass.name}
        actions={
          // On a phone the buttons stack full width with the primary action
          // first, matching the assignment page.
          <>
            <Button variant="outline" asChild className="max-sm:w-full">
              <Link href={`/gradebook?class=${klass.id}`}>
                <Table2 aria-hidden />
                Open gradebook
              </Link>
            </Button>
            <Button variant="outline" asChild className="max-sm:w-full">
              <Link href={`/classes/${klass.id}/assignments/new?kind=TEST`}>
                <Camera aria-hidden />
                New handwritten test
              </Link>
            </Button>
            <Button asChild className="max-sm:order-first max-sm:w-full">
              <Link href={`/classes/${klass.id}/assignments/new`}>
                <Plus aria-hidden />
                New assignment
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <AssignmentList classId={klass.id} items={items} />
        </div>
        <div className="min-w-0">
          <RosterCard classId={klass.id} classTitle={klass.name} students={students} />
        </div>
      </div>
    </PageContainer>
  );
}
