import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ChartColumn, Inbox, Table2, Target, UserPlus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ClassSwitcher } from "@/components/gradebook/class-switcher";
import { HeatmapGrid } from "@/components/insights/heatmap-grid";
import { HeatmapLegend } from "@/components/insights/heatmap-legend";
import { HeatmapScrollHint, HeatmapScrollProvider } from "@/components/insights/heatmap-scroll";
import { InsightsSnapshot } from "@/components/insights/insights-snapshot";
import { MostMissedList } from "@/components/insights/most-missed-list";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTeacherPage } from "@/lib/auth/session";
import { pluralize } from "@/lib/format";
import { MOST_MISSED_MIN_SAMPLE, type ClassHeatmap } from "@/lib/insights/heatmap";
import { listGradebookClasses } from "@/lib/gradebook/query";
import { getClassHeatmap } from "@/lib/insights/query";

export const metadata: Metadata = { title: "Insights" };

const TITLE = "Insights";
const DESCRIPTION =
  "Where your class is losing points, from teacher-approved grades only. Open a student for their profile and a one-click conference brief.";

function single(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first && first.length <= 64 ? first : null;
}

function summarize(heatmap: ClassHeatmap): string {
  return [
    pluralize(heatmap.rows.length, "student"),
    pluralize(heatmap.groups.length, "assignment"),
    pluralize(heatmap.columns.length, "criterion", "criteria"),
  ].join(" · ");
}

function MostMissedCard({ heatmap }: { heatmap: ClassHeatmap }) {
  return (
    <Card className="h-full min-w-0 overflow-hidden lg:col-span-2">
      <CardHeader className="pb-4">
        <CardTitle>
          <h2>Most missed</h2>
        </CardTitle>
        <CardDescription>
          Lowest class averages, each with at least {MOST_MISSED_MIN_SAMPLE} approved grades.
        </CardDescription>
      </CardHeader>
      {heatmap.mostMissed.length === 0 ? (
        <div className="px-6 pb-6">
          <EmptyState
            icon={Target}
            title={`No criterion has ${MOST_MISSED_MIN_SAMPLE} approved grades yet.`}
            description="Approve one more paper on the same assignment to start the ranking."
            className="py-10"
          />
        </div>
      ) : (
        <MostMissedList items={heatmap.mostMissed} className="border-t border-border" />
      )}
    </Card>
  );
}

function HeatmapBody({ heatmap }: { heatmap: ClassHeatmap }) {
  const classHref = `/classes/${encodeURIComponent(heatmap.class.id)}`;

  if (heatmap.rows.length === 0) {
    return (
      <Card className="overflow-hidden">
        <EmptyState
          icon={UserPlus}
          title="Add students to this class to see the heatmap."
          description="Each student gets a row once their grades are approved."
          className="rounded-none border-0 bg-transparent py-16"
          action={
            <Button asChild variant="outline">
              <Link href={classHref}>Open class roster</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  if (heatmap.groups.length === 0) {
    return (
      <Card className="overflow-hidden">
        <EmptyState
          icon={ChartColumn}
          title="Approve a few grades and the heatmap fills in."
          description="Every approved grade adds its rubric scores here. AI drafts in the review queue never count."
          className="rounded-none border-0 bg-transparent py-16"
          action={
            <Button asChild>
              <Link href="/review">
                <Inbox aria-hidden />
                Open review queue
              </Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const classTitle = [heatmap.class.name, heatmap.class.section].filter(Boolean).join(" · ");

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <MostMissedCard heatmap={heatmap} />
        <InsightsSnapshot heatmap={heatmap} />
      </div>

      <Card className="overflow-hidden">
        <HeatmapScrollProvider>
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
            <div className="min-w-0 space-y-1">
              <h2 className="text-base font-semibold tracking-tight text-foreground">Class heatmap</h2>
              <p className="tabular text-sm text-pretty text-muted-foreground">
                {classTitle} · {summarize(heatmap)}
              </p>
            </div>
            <HeatmapScrollHint />
          </div>
          <HeatmapGrid heatmap={heatmap} />
        </HeatmapScrollProvider>
        <div className="border-t border-border px-4 py-4 sm:px-6">
          <HeatmapLegend />
        </div>
      </Card>
    </>
  );
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const teacher = await requireTeacherPage();
  const requestedClassId = single((await searchParams).class);

  // Same classes, in the same order, as the gradebook switcher.
  const classes = await listGradebookClasses(teacher.id);
  // Only ever open a class the teacher owns; an unknown ?class= falls back to the first.
  const selected = classes.find((klass) => klass.id === requestedClassId) ?? classes[0] ?? null;

  if (!selected) {
    return (
      <PageContainer>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <EmptyState
          icon={BookOpen}
          title="Create a class to see where students lose points."
          description="Approved grades from every assignment roll up into a heatmap here."
          action={
            <Button asChild>
              <Link href="/classes">
                Go to classes
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const heatmap = await getClassHeatmap(teacher.id, selected.id);

  return (
    <PageContainer>
      <PageHeader
        title={TITLE}
        description={DESCRIPTION}
        actions={
          <Button asChild variant="outline">
            <Link href={`/gradebook?class=${encodeURIComponent(selected.id)}`}>
              <Table2 aria-hidden />
              Open gradebook
            </Link>
          </Button>
        }
      />

      <ClassSwitcher classes={classes} selectedId={selected.id} basePath="/insights" className="mb-6" />

      <HeatmapBody heatmap={heatmap} />
    </PageContainer>
  );
}
