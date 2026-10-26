import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RubricBuilder } from "@/components/assignments/rubric-builder";
import { PageContainer } from "@/components/page-header";
import { getOwnedClass } from "@/lib/access";
import { openAiConfigured } from "@/lib/ai/openai";
import { AuthError, requireTeacherPage } from "@/lib/auth/session";
import { parseAssignmentKind } from "@/lib/constants";
import { classTheme } from "@/lib/ui/class-theme";

export const metadata: Metadata = { title: "New assignment" };

export default async function NewAssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const teacher = await requireTeacherPage();
  const { classId } = await params;
  const { kind } = await searchParams;
  // ?kind=TEST opens the builder on a handwritten test; anything else is an essay.
  const initialKind = parseAssignmentKind(typeof kind === "string" ? kind : null);
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
      {/* Keyed by kind: "Create handwritten test in …" from search, opened on this class's
          essay builder, only changes ?kind, and the builder would keep its essay state. */}
      <RubricBuilder
        key={initialKind}
        classId={klass.id}
        classColor={classTheme(klass).color}
        initialKind={initialKind}
        answerKeyEngine={openAiConfigured() ? "openai" : "demo"}
      />
    </PageContainer>
  );
}
