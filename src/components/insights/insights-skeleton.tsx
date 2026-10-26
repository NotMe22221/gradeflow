import { PageContainer } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ROWS = [0, 1, 2, 3, 4, 5];
const CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Loading state that mirrors the insights page: header, class chips, ranking, snapshot, heatmap. */
export function InsightsSkeleton() {
  return (
    <PageContainer aria-busy aria-label="Loading insights">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2.5">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-[34rem] max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-10 w-44 rounded-full" />
      </div>

      <div className="mb-6 flex gap-2 overflow-hidden">
        <Skeleton className="h-10 w-48 shrink-0 rounded-full" />
        <Skeleton className="h-10 w-64 shrink-0 rounded-full" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 @4xl:grid-cols-3">
        <Card className="@4xl:col-span-2">
          <div className="space-y-2 px-4 pt-5 pb-4 sm:px-6">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="flex items-start gap-4 border-t border-border px-4 py-3.5 sm:px-6">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-3 w-64 max-w-full" />
                <Skeleton className="h-1 w-full rounded-full" />
              </div>
              <div className="space-y-1.5 pt-0.5">
                <Skeleton className="ml-auto h-5 w-10" />
                <Skeleton className="ml-auto h-3 w-16" />
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <div className="space-y-2 px-5 pt-5 pb-4 sm:px-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 px-5 pb-6 sm:px-6">
            {[0, 1, 2, 3].map((stat) => (
              <div key={stat} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-12" />
              </div>
            ))}
          </div>
          <div className="space-y-2 px-5 pb-6 sm:px-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
              {[0, 1, 2, 3, 4].map((band) => (
                <Skeleton key={band} className="h-3 w-full" />
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-4 py-4 sm:px-6">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        </div>
        <div className="space-y-1 overflow-hidden px-4 py-4 sm:px-6">
          {ROWS.map((row) => (
            <div key={row} className="flex items-center gap-1">
              <Skeleton className="mr-3 h-4 w-28 shrink-0 sm:w-44" />
              {CELLS.map((cell) => (
                <Skeleton key={cell} className="h-8 w-[4.25rem] shrink-0 rounded-md" />
              ))}
            </div>
          ))}
        </div>
      </Card>
    </PageContainer>
  );
}
