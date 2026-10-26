import { ClassCardGridSkeleton } from "@/components/classes/class-card-skeleton";
import { PageContainer } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function SideCardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex min-h-14 items-center justify-between px-5 pt-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="divide-y divide-border border-t border-border">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex min-h-14 items-center gap-3 px-5 py-2.5">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36 max-w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="ml-auto h-4 w-10" />
              <Skeleton className="ml-auto h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Loading state that mirrors Home's layout so nothing jumps on load. */
export function DashboardSkeleton() {
  return (
    <PageContainer aria-busy aria-label="Loading Home">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
        <Skeleton className="h-10 w-44 rounded-full" />
      </div>

      {/* Stat strip */}
      <div className="mt-6 grid grid-cols-1 divide-y divide-border rounded-xl border border-border bg-card md:grid-cols-3 md:divide-x md:divide-y-0">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-start gap-4 px-5 py-4">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-36 max-w-full" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-44 max-w-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Teaching tools */}
      <div className="mt-10">
        <div className="mb-4 flex min-h-10 items-center">
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={cn(
                "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:p-5",
                index === 2 && "sm:col-span-2 xl:col-span-1"
              )}
            >
              <div className="flex items-start gap-4">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-2/3" />
                </div>
              </div>
              <Skeleton className="ml-14 h-5 w-28" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <div className="mb-4 flex min-h-10 items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <ClassCardGridSkeleton count={2} />
        </div>
        <div className="grid min-w-0 grid-cols-1 content-start gap-6 md:grid-cols-2 xl:grid-cols-1 xl:pt-14">
          <SideCardSkeleton rows={5} />
          <SideCardSkeleton rows={3} />
        </div>
      </div>
    </PageContainer>
  );
}
