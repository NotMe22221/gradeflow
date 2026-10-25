import { Target, TrendingUp, type LucideIcon } from "lucide-react";

import { HEAT_TONE } from "@/components/insights/heat-tone";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatHeatPercent, heatBand } from "@/lib/insights/heatmap";
import { GROWTH_MAX_PERCENT, STRENGTH_MIN_PERCENT, type SkillInsight } from "@/lib/insights/profile";
import { cn } from "@/lib/utils";

function SkillList({
  title,
  icon: Icon,
  iconClassName,
  items,
  empty,
}: {
  title: string;
  icon: LucideIcon;
  iconClassName: string;
  items: SkillInsight[];
  empty: string;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className={cn("size-4", iconClassName)} aria-hidden />
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((skill) => (
            <li key={skill.title} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium break-words text-foreground">{skill.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground" title={skill.assignments.join(", ")}>
                  {skill.assignments.join(", ")}
                </p>
              </div>
              <span
                className={cn(
                  "tabular inline-flex h-6 min-w-12 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-semibold",
                  HEAT_TONE[heatBand(skill.percent)].cell
                )}
              >
                {formatHeatPercent(skill.percent)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Strengths and growth areas, computed in code from per-criterion percentages. */
export function SkillsCard({
  strengths,
  growthAreas,
  hasGrades,
}: {
  strengths: SkillInsight[];
  growthAreas: SkillInsight[];
  hasGrades: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>
          <h2>Strengths and growth areas</h2>
        </CardTitle>
        <CardDescription>From rubric scores on approved grades.</CardDescription>
      </CardHeader>
      <div className="space-y-6 px-6 pb-6">
        {hasGrades ? (
          <>
            <SkillList
              title="Strengths"
              icon={TrendingUp}
              iconClassName="text-success"
              items={strengths}
              empty={`No criterion averages ${STRENGTH_MIN_PERCENT}% or more yet.`}
            />
            <SkillList
              title="Growth areas"
              icon={Target}
              iconClassName="text-warning"
              items={growthAreas}
              empty={`Every criterion averages ${GROWTH_MAX_PERCENT}% or more.`}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Approve a grade to see strengths and growth areas.</p>
        )}
      </div>
    </Card>
  );
}
