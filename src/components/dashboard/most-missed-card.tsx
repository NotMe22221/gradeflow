import { Target } from "@/components/icons";
import { ListCard, ListCardEmpty } from "@/components/dashboard/recently-published";
import { MostMissedList } from "@/components/insights/most-missed-list";
import type { MostMissedItem } from "@/lib/insights/heatmap";

/**
 * The criteria students lose the most points on, across the teacher's
 * classes. Teacher-approved grades only; each row opens that class's heatmap.
 */
export function MostMissedCard({
  items,
  hasClasses = true,
  className,
}: {
  items: MostMissedItem[];
  hasClasses?: boolean;
  className?: string;
}) {
  return (
    <ListCard
      footnote={items.length > 0 ? "Lowest class averages this term, from approved grades only." : undefined}
      className={className}
    >
      {items.length === 0 ? (
        <ListCardEmpty icon={Target}>
          {hasClasses
            ? "Approve a few grades and this fills in with the criteria your classes lose the most points on."
            : "Once your classes have approved grades, the criteria they miss most show up here."}
        </ListCardEmpty>
      ) : (
        <MostMissedList items={items} showClass linkTo="insights" dense />
      )}
    </ListCard>
  );
}
