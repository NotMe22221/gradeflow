import type { Metadata } from "next";

import { InsightsNoClasses, InsightsView } from "@/components/insights/insights-view";
import { requireTeacherPage } from "@/lib/auth/session";
import { listGradebookClasses } from "@/lib/gradebook/query";
import { getClassHeatmap } from "@/lib/insights/query";

export const metadata: Metadata = { title: "Insights" };

function single(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first && first.length <= 64 ? first : null;
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

  if (!selected) return <InsightsNoClasses />;

  const heatmap = await getClassHeatmap(teacher.id, selected.id);

  return <InsightsView classes={classes} heatmap={heatmap} />;
}
