import { PageContainer } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ROWS = [0, 1, 2, 3, 4, 5];
const COLUMNS = [0, 1, 2];

/** Loading state that mirrors the gradebook: header, class switcher, table. */
export function GradebookSkeleton() {
  return (
    <PageContainer aria-busy aria-label="Loading the gradebook">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-3 w-52" />
        </div>
      </div>

      <Skeleton className="mb-6 h-10 w-80 max-w-full rounded-lg" />

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <Skeleton className="hidden h-8 w-24 sm:block" />
        </div>
        <div className="overflow-hidden">
          <div className="flex items-end gap-6 border-b border-border px-6 py-3">
            <Skeleton className="h-4 w-40 shrink-0 sm:w-52" />
            {COLUMNS.map((column) => (
              <div key={column} className="w-32 shrink-0 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
            <Skeleton className="ml-auto h-4 w-14 shrink-0" />
          </div>
          {ROWS.map((row) => (
            <div key={row} className="flex items-center gap-6 border-b border-border px-6 py-3 last:border-0">
              <div className="flex w-40 shrink-0 items-center gap-3 sm:w-52">
                <Skeleton className="hidden size-7 rounded-full sm:block" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="hidden h-3 w-36 sm:block" />
                </div>
              </div>
              {COLUMNS.map((column) => (
                <Skeleton key={column} className="h-5 w-20 shrink-0 sm:mr-12" />
              ))}
              <Skeleton className="ml-auto h-4 w-10 shrink-0" />
            </div>
          ))}
        </div>
      </Card>
    </PageContainer>
  );
}
