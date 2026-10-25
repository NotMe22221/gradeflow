import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { RubricBuilder } from "@/components/assignments/rubric-builder";
import { PageContainer, PageHeader } from "@/components/page-header";
import { getOwnedClass } from "@/lib/access";
import { AuthError, requireTeacherPage } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New assignment" };

export default async function NewAssignmentPage({ params }: { params: Promise<{ classId: string }> }) {
  const teacher = await requireTeacherPage();
  const { classId } = await params;
  if (classId.length > 64) notFound();

  let klass;
  try {
    klass = await getOwnedClass(teacher.id, classId);
  } catch (error) {
    if (error instanceof AuthError) notFound();
    throw error;
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={
          <span className="flex min-w-0 items-center gap-1">
            <Link
              href={`/classes/${klass.id}`}
              className="truncate rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              {klass.name}
            </Link>
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
            <span>New assignment</span>
          </span>
        }
        title="New assignment"
        description="Write the prompt and the rubric. The AI grades against exactly these criteria, and you approve every grade."
      />
      <RubricBuilder classId={klass.id} />
    </PageContainer>
  );
}
