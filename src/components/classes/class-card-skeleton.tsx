import { ClassCardGrid } from "@/components/classes/class-card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading stand-in for a ClassCard: banner, avatar, due-soon lines, footer icons. */
export function ClassCardSkeleton() {
  return (
    <div className="relative flex min-h-[18.5rem] flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="h-[104px] space-y-2 bg-muted px-4 pt-4">
        <Skeleton className="h-6 w-40 max-w-[70%] bg-foreground/[0.07]" />
        <Skeleton className="h-4 w-28 bg-foreground/[0.07]" />
        <Skeleton className="h-3.5 w-20 bg-foreground/[0.07]" />
      </div>
      <Skeleton className="absolute top-[4.5rem] right-4 size-16 rounded-full ring-4 ring-card" />
      <div className="flex-1 space-y-3 px-4 pt-4 pb-4">
        <div className="space-y-1.5 pr-[4.5rem]">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="flex justify-end gap-1 border-t border-border px-2 py-1.5">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="m-2 size-6 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function ClassCardGridSkeleton({ count = 2 }: { count?: number }) {
  return (
    <ClassCardGrid aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <ClassCardSkeleton />
        </li>
      ))}
    </ClassCardGrid>
  );
}
