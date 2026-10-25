import { Target } from "lucide-react";

import { SectionHeader } from "@/components/dashboard/section-header";
import { EmptyState } from "@/components/empty-state";
import { MostMissedList } from "@/components/insights/most-missed-list";
import { Card } from "@/components/ui/card";
import type { MostMissedItem } from "@/lib/insights/heatmap";

/**
 * The criteria students lose the most points on, across the teacher's
 * classes. Teacher-approved grades only; each row opens that class's heatmap.
 */
export function MostMissedCard({ items, className }: { items: MostMissedItem[]; className?: string }) {
  return (
    <section aria-labelledby="most-missed-heading" className={className}>
      <SectionHeader id="most-missed-heading" title="Most missed this term" href="/insights" linkLabel="Insights" />
      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Approve a few grades and the heatmap fills in."
            description="The criteria your class loses the most points on show up here."
            className="rounded-none border-0 bg-transparent py-12"
          />
        ) : (
          <>
            <MostMissedList items={items} showClass linkTo="insights" dense />
            <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
              Lowest class averages, from approved grades only.
            </p>
          </>
        )}
      </Card>
    </section>
  );
}
