import { PageContainer } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScanLoading() {
  return (
    <PageContainer aria-busy="true" aria-label="Loading the paper scanner">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-[34rem] max-w-full" />
        </div>
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <Skeleton className="h-6 w-10 rounded-full" />
          </div>
          <div className="mt-6 grid gap-2 sm:flex">
            <Skeleton className="h-9 w-full sm:w-32" />
            <Skeleton className="h-9 w-full sm:w-36" />
            <Skeleton className="h-9 w-full sm:ml-auto sm:w-44" />
          </div>
          <Skeleton className="mt-5 h-52 w-full rounded-xl" />
          <div className="mt-5 space-y-2 border-t border-border pt-5">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3.5 w-64 max-w-full" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-60 max-w-full" />
          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-3.5 w-full" />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
