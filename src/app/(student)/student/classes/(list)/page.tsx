import type { Metadata } from "next";

import { BookOpen } from "@/components/icons";
import { EmptyState } from "@/components/empty-state";
import { ArrangeableClassGrid } from "@/components/layout-editor/arrangeable-class-grid";
import { ArrangeButton, FixedRegion, LayoutEditorProvider } from "@/components/layout-editor/editor-context";
import { PageContainer, PageHeader } from "@/components/page-header";
import { buildClassCards, StudentClassCard } from "@/components/student/class-card";
import { todoTabFor } from "@/components/student/todo-model";
import { requireStudentPage } from "@/lib/auth/session";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";
import { pluralize } from "@/lib/format";
import { getPreferences } from "@/lib/preferences/server";

import { loadStudentWork } from "../../data";

export const metadata: Metadata = { title: "Classes" };

/**
 * The student's classes as cards, in their own order (Arrange, or
 * ?customize=1, to change it). Only classes this student is enrolled in,
 * with their own work: nothing about classmates, and no AI drafts.
 */
export default async function StudentClassesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const student = await requireStudentPage();
  const now = new Date();
  const [timeZone, preferences, params] = await Promise.all([
    viewerTimeZone(),
    getPreferences(student.id),
    searchParams,
  ]);

  const { classes, rows } = await loadStudentWork(student.id, now, { timeZone });
  const cards = buildClassCards(classes, rows, now, timeZone);
  const missing = rows.filter((row) => todoTabFor(row) === "missing").length;

  const description =
    cards.length === 0
      ? "Classes your teachers add you to show up here."
      : missing > 0
        ? `You're in ${pluralize(cards.length, "class", "classes")}. ${pluralize(missing, "piece", "pieces")} of work ${missing === 1 ? "is" : "are"} missing.`
        : `You're in ${pluralize(cards.length, "class", "classes")}. Nothing is missing.`;

  return (
    <PageContainer>
      <LayoutEditorProvider
        classOrder={preferences.layout.classOrder}
        label="your classes"
        startEditing={params.customize === "1" && cards.length > 1}
      >
        <FixedRegion>
          <PageHeader
            title="Classes"
            description={description}
            actions={cards.length > 1 ? <ArrangeButton /> : null}
          />
        </FixedRegion>
        <ArrangeableClassGrid
          label="Your classes"
          items={cards.map((card) => ({ id: card.id, name: card.name, node: <StudentClassCard data={card} /> }))}
          empty={
            <EmptyState
              icon={BookOpen}
              title="You're not enrolled in any classes yet."
              description="When your teacher adds you to a class, it shows up here with its assignments."
              className="py-16"
            />
          }
        />
      </LayoutEditorProvider>
    </PageContainer>
  );
}
