import { PageContainer } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScanLoading() {
  return (
    <PageContainer aria-busy="true" aria-label="Loading the paper scanner">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2.5">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-[36rem] max-w-full" />
          <Skeleton className="h-4 w-[28rem] max-w-full" />
        </div>
        <Skeleton className="h-6 w-32 rounded-md" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <div className="min-w-0 rounded-xl border border-border bg-card">
          <div className="flex items-start gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <Skeleton className="h-7 w-12 rounded-full" />
          </div>
          <div className="px-4 py-5 sm:px-6 sm:py-6">
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-input/30 px-5 py-10">
              <Skeleton className="size-14 rounded-full" />
              <Skeleton className="h-5 w-64 max-w-full" />
              <Skeleton className="h-4 w-80 max-w-full" />
              <div className="mt-3 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Skeleton className="h-10 w-full rounded-full sm:w-36" />
                <Skeleton className="h-10 w-full rounded-full sm:w-40" />
                <Skeleton className="h-10 w-full rounded-full sm:w-48" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-border px-4 py-5 sm:px-6">
            <Skeleton className="size-5 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3.5 w-64 max-w-full" />
            </div>
          </div>
        </div>
        <div className="min-w-0 rounded-xl border border-border bg-card px-4 py-5 sm:p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-60 max-w-full" />
          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <Skeleton className="h-12 w-full rounded-full" />
            <Skeleton className="h-3.5 w-full" />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
