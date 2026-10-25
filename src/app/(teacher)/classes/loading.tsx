import { PageContainer } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClassesLoading() {
  return (
    <PageContainer aria-busy="true" aria-label="Loading classes">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-6 shadow-card">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-2 h-4 w-36" />
            <div className="mt-6 flex gap-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="mt-6 flex gap-2 border-t border-border pt-4">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
