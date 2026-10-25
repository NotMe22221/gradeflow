import Link from "next/link";
import { ArrowRight, Camera, ChartColumn, FileText, type LucideIcon } from "lucide-react";

import { BriefStudentPicker } from "@/components/dashboard/brief-student-picker";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { BriefPickerClass } from "@/lib/insights/brief-picker";

function ToolTile({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground ring-1 ring-border">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{description}</p>
        </div>
      </div>
      {/* mt-auto lines the three actions up along the bottom of the row. */}
      <div className="mt-auto">{children}</div>
    </div>
  );
}

/**
 * The three AI teaching tools from the Teacher Dashboard brief, one tile each:
 * the Paper Scanner, the class heatmap, and conference briefs (pick a student,
 * then one click on their profile drafts the brief). One card with dividers
 * keeps the row compact; on phones the tiles stack.
 */
export function TeachingTools({ briefClasses, className }: { briefClasses: BriefPickerClass[]; className?: string }) {
  return (
    <section aria-labelledby="teaching-tools-heading" className={className}>
      <SectionHeader id="teaching-tools-heading" title="Teaching tools" />
      <Card className="grid grid-cols-1 divide-y divide-border overflow-hidden md:grid-cols-3 md:divide-x md:divide-y-0">
        <ToolTile
          icon={Camera}
          title="Paper Scanner"
          description="Snap a handwritten test and its answer key. AI drafts the scores for your review."
        >
          <Button asChild variant="outline" size="sm">
            <Link href="/scan">
              Scan a test
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </ToolTile>

        <ToolTile
          icon={ChartColumn}
          title="Class heatmap"
          description="See which questions and rubric criteria each class misses most."
        >
          <Button asChild variant="outline" size="sm">
            <Link href="/insights">
              Open heatmap
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </ToolTile>

        <ToolTile
          icon={FileText}
          title="Conference briefs"
          description="A one-page summary of a student's approved grades for a family conference."
        >
          {briefClasses.length > 0 ? (
            <BriefStudentPicker classes={briefClasses} />
          ) : (
            <p className="flex min-h-8 items-center text-sm text-muted-foreground">
              Approve a grade to draft the first brief.
            </p>
          )}
        </ToolTile>
      </Card>
    </section>
  );
}
