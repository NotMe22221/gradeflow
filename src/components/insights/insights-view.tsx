import Link from "next/link";
import { ArrowRight, BookOpen, ChartColumn, Inbox, Table2, Target, UserPlus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ClassAvatar } from "@/components/classroom/class-avatar";
import { ClassChips } from "@/components/classroom/class-chips";
import { HeatmapGrid } from "@/components/insights/heatmap-grid";
import { HeatmapLegend } from "@/components/insights/heatmap-legend";
import { HeatmapScrollHint, HeatmapScrollProvider } from "@/components/insights/heatmap-scroll";
import { InsightsSnapshot } from "@/components/insights/insights-snapshot";
import { MostMissedList } from "@/components/insights/most-missed-list";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { pluralize } from "@/lib/format";
import type { GradebookClassOption } from "@/lib/gradebook/types";
import { MOST_MISSED_MIN_SAMPLE, type ClassHeatmap } from "@/lib/insights/heatmap";

/*
 * The Insights screen (presentation only; the page loads the data). Class
 * chips, then "Most missed" as a Classroom-style list beside the class
 * snapshot, then the class heatmap. Everything here comes from
 * teacher-approved grades only.
 */

const TITLE = "Insights";
const DESCRIPTION =
  "Where your class is losing points, from teacher-approved grades only. Open a student for their profile and a one-click conference brief.";

function summarize(heatmap: ClassHeatmap): string {
  return [
    pluralize(heatmap.rows.length, "student"),
    pluralize(heatmap.groups.length, "assignment"),
    pluralize(heatmap.columns.length, "criterion", "criteria"),
  ].join(" · ");
}

function CardHeading({ id, title, description }: { id: string; title: string; description: React.ReactNode }) {
  return (
    <div className="space-y-1 px-4 pt-5 pb-4 sm:px-6">
      <h2 id={id} className="text-base leading-snug font-semibold text-foreground">
        {title}
      </h2>
      <p className="text-sm text-pretty text-muted-foreground">{description}</p>
    </div>
  );
}

function MostMissedCard({ heatmap }: { heatmap: ClassHeatmap }) {
  return (
    <Card aria-labelledby="most-missed-heading" role="region" className="h-full min-w-0 overflow-hidden @4xl:col-span-2">
      <CardHeading
        id="most-missed-heading"
        title="Most missed"
        description={`Lowest class averages, each with at least ${MOST_MISSED_MIN_SAMPLE} approved grades.`}
      />
      {heatmap.mostMissed.length === 0 ? (
        <div className="px-4 pb-6 sm:px-6">
          <EmptyState
            icon={Target}
            title={`No criterion has ${MOST_MISSED_MIN_SAMPLE} approved grades yet.`}
            description="Approve one more paper on the same assignment to start the ranking."
            className="border-dashed bg-background py-10"
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
      <EmptyState
        icon={UserPlus}
        title="Add students to this class to see the heatmap."
        description="Each student gets a row once their grades are approved."
        className="py-16"
        action={
          <Button asChild variant="tonal">
            <Link href={`${classHref}/people`}>Go to People</Link>
          </Button>
        }
      />
    );
  }

  if (heatmap.groups.length === 0) {
    return (
      <EmptyState
        icon={ChartColumn}
        title="Approve a few grades and the heatmap fills in."
        description="Every approved grade adds its rubric scores here. AI drafts waiting in To review never count."
        className="py-16"
        action={
          <Button asChild>
            <Link href="/review">
              <Inbox aria-hidden />
              Open To review
            </Link>
          </Button>
        }
      />
    );
  }

  const classTitle = [heatmap.class.name, heatmap.class.section].filter(Boolean).join(" · ");

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-6 @4xl:grid-cols-3">
        <MostMissedCard heatmap={heatmap} />
        <InsightsSnapshot heatmap={heatmap} />
      </div>

      <Card aria-labelledby="heatmap-heading" role="region" className="min-w-0 overflow-hidden">
        <HeatmapScrollProvider>
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <ClassAvatar name={heatmap.class.name} className="size-10 text-base" />
              <div className="min-w-0">
                <h2 id="heatmap-heading" className="text-base leading-snug font-semibold text-foreground">
                  Class heatmap
                </h2>
                <p className="tabular text-sm text-pretty text-muted-foreground">
                  {classTitle} · {summarize(heatmap)}
                </p>
              </div>
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

/** No classes yet: say what to do next. */
export function InsightsNoClasses() {
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

export function InsightsView({
  classes,
  heatmap,
}: {
  classes: GradebookClassOption[];
  heatmap: ClassHeatmap;
}) {
  const selectedId = heatmap.class.id;
  return (
    <PageContainer>
      <PageHeader
        title={TITLE}
        description={DESCRIPTION}
        className="mb-6"
        actions={
          <Button asChild variant="outline">
            <Link href={`/gradebook?class=${encodeURIComponent(selectedId)}`}>
              <Table2 aria-hidden />
              Open gradebook
            </Link>
          </Button>
        }
      />

      <ClassChips classes={classes} selectedId={selectedId} basePath="/insights" className="mb-6" />

      <HeatmapBody heatmap={heatmap} />
    </PageContainer>
  );
}
