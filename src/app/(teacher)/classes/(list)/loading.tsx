import { ClassCardGridSkeleton } from "@/components/classes/class-card-skeleton";
import { PageContainer } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The /classes index skeleton. It lives in the (list) route group so it wraps
 * only this page: a loading.tsx at the classes segment would also wrap the
 * [classId] layout, and entering a class would flash this card grid instead
 * of the class's tab bar and its own skeleton.
 */
export default function ClassesLoading() {
  return (
    <PageContainer aria-busy="true" aria-label="Loading classes">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
      </div>
      <ClassCardGridSkeleton count={3} />
    </PageContainer>
  );
}
