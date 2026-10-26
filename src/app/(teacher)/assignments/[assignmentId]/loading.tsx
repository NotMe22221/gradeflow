import { PageContainer } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function AssignmentLoading() {
  return (
    <PageContainer aria-busy="true" aria-label="Loading assignment">
      <Skeleton className="mb-4 h-6 w-56 rounded-full" />
      <div className="mb-2 flex items-start gap-4">
        <Skeleton className="size-12 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-[28rem] max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="mb-6 flex gap-1 border-b border-border">
        <div className="flex h-12 items-center px-4">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex h-12 items-center px-4">
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="space-y-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex gap-6">
            {[0, 1, 2].map((index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-10 w-full rounded-full sm:w-40" />
            <Skeleton className="h-10 w-full rounded-full sm:w-60" />
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="space-y-1.5 px-4 py-4 md:px-6">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3.5 w-20" />
          </div>
          <div className="border-y border-border bg-background px-4 py-2 md:px-6">
            <Skeleton className="h-4 w-24" />
          </div>
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex min-h-16 items-center gap-4 border-b border-border px-4 py-3 last:border-0 md:px-6">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44 max-w-full" />
              </div>
              <Skeleton className="hidden h-5 w-40 rounded-full md:block" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
