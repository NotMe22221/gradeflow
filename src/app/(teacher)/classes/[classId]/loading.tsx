import { PageContainer } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClassLoading() {
  return (
    <PageContainer aria-busy="true" aria-label="Loading class">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-52" />
          <Skeleton className="h-7 w-44" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-40" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card shadow-card lg:col-span-2">
          <div className="space-y-2 px-6 pt-6 pb-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-56" />
          </div>
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-3 border-t border-border px-6 py-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-3.5 w-64 max-w-full" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-start justify-between px-6 pt-6 pb-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-28" />
          </div>
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 border-t border-border px-6 py-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3.5 w-48 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
