import { Target } from "@/components/icons";

import { SideCard, SideCardEmpty } from "@/components/dashboard/recently-published";
import { MostMissedList } from "@/components/insights/most-missed-list";
import type { MostMissedItem } from "@/lib/insights/heatmap";

/**
 * The criteria students lose the most points on, across the teacher's
 * classes. Teacher-approved grades only; each row opens that class's heatmap.
 */
export function MostMissedCard({ items, className }: { items: MostMissedItem[]; className?: string }) {
  return (
    <SideCard
      id="most-missed-heading"
      title="Most missed this term"
      href="/insights"
      linkLabel="Insights"
      footnote={items.length > 0 ? "Lowest class averages, from approved grades only." : undefined}
      className={className}
    >
      {items.length === 0 ? (
        <SideCardEmpty icon={Target}>
          Approve a few grades and the heatmap fills in with the criteria your class loses the most points on.
        </SideCardEmpty>
      ) : (
        <MostMissedList items={items} showClass linkTo="insights" dense className="border-t border-border" />
      )}
    </SideCard>
  );
}
