import { Target, TrendingUp, type IconComponent } from "@/components/icons";

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
  icon: IconComponent;
  iconClassName: string;
  items: SkillInsight[];
  empty: string;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-2.5 px-5 font-sans text-sm font-medium text-foreground sm:px-6">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", iconClassName)}>
          <Icon className="size-4" aria-hidden />
        </span>
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 px-5 text-sm text-muted-foreground sm:px-6">{empty}</p>
      ) : (
        <ul className="mt-1.5">
          {items.map((skill) => (
            <li key={skill.title} className="flex items-start justify-between gap-3 px-5 py-2 compact:py-1.5 sm:px-6">
              <div className="min-w-0">
                <p className="text-[0.875rem] break-words text-foreground">{skill.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground" title={skill.assignments.join(", ")}>
                  {skill.assignments.join(", ")}
                </p>
              </div>
              <span
                className={cn(
                  "tabular inline-flex h-6 min-w-12 shrink-0 items-center justify-center rounded-full px-2 text-xs font-semibold",
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
    <Card className="min-w-0">
      <CardHeader className="gap-1 px-5 pt-5 pb-4 sm:px-6">
        <CardTitle>
          <h2>Strengths and growth areas</h2>
        </CardTitle>
        <CardDescription>From rubric scores on approved grades.</CardDescription>
      </CardHeader>
      {hasGrades ? (
        <div className="space-y-4 border-t border-border pt-4 pb-4">
          <SkillList
            title="Strengths"
            icon={TrendingUp}
            iconClassName="bg-success-soft text-success-soft-foreground"
            items={strengths}
            empty={`No criterion averages ${STRENGTH_MIN_PERCENT}% or more yet.`}
          />
          <SkillList
            title="Growth areas"
            icon={Target}
            iconClassName="bg-warning-soft text-warning-soft-foreground"
            items={growthAreas}
            empty={`Every criterion averages ${GROWTH_MAX_PERCENT}% or more.`}
          />
        </div>
      ) : (
        <p className="px-5 pb-6 text-sm text-muted-foreground sm:px-6">Approve a grade to see strengths and growth areas.</p>
      )}
    </Card>
  );
}
