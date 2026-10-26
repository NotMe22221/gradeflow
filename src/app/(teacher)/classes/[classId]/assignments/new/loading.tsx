import { PageContainer } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewAssignmentLoading() {
  return (
    <PageContainer aria-busy="true" aria-label="Loading the assignment form">
      <div className="mb-6 flex items-start gap-4 sm:mb-8">
        <Skeleton className="size-12 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="hidden gap-2 md:flex">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-44 rounded-full" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
        <div className="space-y-6">
          <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-12 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
          <Skeleton className="h-7 w-28" />
          <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="space-y-2 p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2 p-5">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
