import { ClassCardGridSkeleton } from "@/components/classes/class-card-skeleton";
import { PageContainer } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClassesLoading() {
  return (
    <PageContainer aria-busy="true" aria-label="Loading classes">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-40 rounded-full" />
      </div>
      <ClassCardGridSkeleton count={3} />
    </PageContainer>
  );
}
