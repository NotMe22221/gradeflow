import { PageContainer } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ROWS = [0, 1, 2, 3, 4, 5];
const CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Loading state that mirrors the insights page: header, switcher, ranking, heatmap. */
export function InsightsSkeleton() {
  return (
    <PageContainer aria-busy aria-label="Loading insights">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      <Skeleton className="mb-6 h-10 w-80 max-w-full rounded-lg" />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="space-y-2 px-6 pt-6 pb-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="flex items-center gap-4 border-t border-border px-6 py-4">
              <Skeleton className="size-6 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-3 w-64 max-w-full" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="ml-auto h-4 w-10" />
                <Skeleton className="ml-auto h-3 w-16" />
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <div className="space-y-2 px-6 pt-6 pb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 px-6 pb-6">
            {[0, 1, 2, 3].map((stat) => (
              <div key={stat} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="space-y-2 border-b border-border px-6 py-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-72 max-w-full" />
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
