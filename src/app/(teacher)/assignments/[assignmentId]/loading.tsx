import { PageContainer } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function AssignmentLoading() {
  return (
    <PageContainer aria-busy="true" aria-label="Loading assignment">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-7 w-[28rem] max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="size-9" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-56" />
        </div>
      </div>
      <div className="space-y-6">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="space-y-2 px-6 pt-6 pb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="border-t border-border">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex items-center gap-6 border-b border-border px-6 py-3 last:border-0">
                <div className="flex min-w-0 flex-1 items-center gap-3 xl:w-48 xl:flex-none">
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-5 w-24 shrink-0 rounded-full" />
                <Skeleton className="hidden h-4 w-16 xl:block" />
                <Skeleton className="hidden h-5 w-16 rounded-full xl:block" />
                <Skeleton className="ml-auto hidden h-8 w-20 sm:block" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    </PageContainer>
  );
}
