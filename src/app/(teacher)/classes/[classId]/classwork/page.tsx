import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ClipboardCheck, FileText, ScanLine } from "lucide-react";

import { classReviewHref } from "@/components/classes/class-card";
import { summarizeStatuses } from "@/components/classes/status-summary";
import { ClassworkList } from "@/components/classwork/classwork-list";
import { CreateMenu } from "@/components/classwork/create-menu";
import type { ClassworkItem } from "@/components/classwork/types";
import { PageContainer } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getOwnedClass } from "@/lib/access";
import { AuthError, requireTeacherPage } from "@/lib/auth/session";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";
import { parseAssignmentKind } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate, formatDueDate, pluralize } from "@/lib/format";
import { classTheme } from "@/lib/ui/class-theme";

type Params = Promise<{ classId: string }>;

/** How much of the prompt the expanded row shows (it is clamped to three lines). */
const EXCERPT_CHARS = 320;

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
  return { title: klass ? `Classwork · ${klass.name}` : "Classwork" };
}

function excerpt(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > EXCERPT_CHARS ? `${trimmed.slice(0, EXCERPT_CHARS).trimEnd()}…` : trimmed;
}

export default async function ClassworkPage({ params }: { params: Params }) {
  const klass = await loadOwnedClass((await params).classId);
  if (!klass) notFound();

  const [assignments, rosterCount, timeZone] = await Promise.all([
    db.assignment.findMany({
      where: { classId: klass.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        kind: true,
        instructions: true,
        dueDate: true,
        createdAt: true,
        criteria: { select: { maxPoints: true } },
        submissions: { select: { status: true } },
      },
    }),
    db.enrollment.count({ where: { classId: klass.id, student: { role: "STUDENT" } } }),
    viewerTimeZone(),
  ]);

  const items: ClassworkItem[] = assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    isTest: parseAssignmentKind(assignment.kind) === "TEST",
    dueLabel: assignment.dueDate ? `Due ${formatDueDate(assignment.dueDate)}` : null,
    postedLabel: `Posted ${formatDate(assignment.createdAt, timeZone)}`,
    excerpt: excerpt(assignment.instructions),
    totalPoints: assignment.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0),
    criteriaCount: assignment.criteria.length,
    summary: summarizeStatuses(
      assignment.submissions.map((submission) => submission.status),
      rosterCount
    ),
  }));
  const toReview = items.reduce((sum, item) => sum + item.summary.review, 0);
  // Same deep link as the class card: straight to the one assignment with drafts, else the whole queue.
  const reviewHref = classReviewHref({
    pendingAssignmentIds: items.filter((item) => item.summary.review > 0).map((item) => item.id),
  });
  const newHref = `/classes/${encodeURIComponent(klass.id)}/assignments/new`;

  return (
    <PageContainer className="max-w-5xl">
      {/* The class tab bar shows the class name as a link, so the page title is for screen readers. */}
      <h1 className="sr-only">Classwork · {klass.name}</h1>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <CreateMenu classId={klass.id} />
        {toReview > 0 ? (
          <Button variant="text" asChild>
            <Link href={reviewHref}>
              <ClipboardCheck aria-hidden />
              {pluralize(toReview, "paper")} waiting for your review
            </Link>
          </Button>
        ) : items.length > 0 ? (
          <p className="text-sm text-muted-foreground">Nothing is waiting for your review.</p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-16 text-center">
          <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
            <FileText className="size-10" aria-hidden />
          </div>
          <h2 className="text-[22px] font-normal text-foreground">Create assignments and tests for your class.</h2>
          <p className="mt-2 max-w-md text-sm text-pretty text-muted-foreground">
            Write a rubric for typed essays, or an answer key for paper tests you scan. The AI drafts every grade
            and you approve each one.
          </p>
          <div className="mt-8 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button asChild>
              <Link href={newHref}>
                <FileText aria-hidden />
                New assignment
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`${newHref}?kind=TEST`}>
                <ScanLine aria-hidden />
                New handwritten test
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <ClassworkList items={items} color={classTheme(klass).color} />
      )}
    </PageContainer>
  );
}
