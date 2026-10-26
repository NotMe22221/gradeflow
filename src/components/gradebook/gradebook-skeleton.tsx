import { PageContainer } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ROWS = [0, 1, 2, 3, 4, 5];
const COLUMNS = [0, 1, 2, 3];

/** Loading state that mirrors GradesView: summary and export, then the grid. */
export function GradesSkeleton({ withClassHeader = false }: { withClassHeader?: boolean }) {
  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Skeleton className="mt-2.5 h-4 w-72 max-w-full" />
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <Skeleton className="h-10 w-36 rounded-full" />
          <Skeleton className="h-3 w-52" />
        </div>
      </div>
      <Card className="overflow-hidden">
        {withClassHeader ? (
          <div className="flex items-center gap-3 border-b border-border px-4 py-4 sm:px-6">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          </div>
        ) : null}
        <div className="overflow-hidden">
          <div className="flex items-stretch border-b border-border">
            <div className="flex w-40 shrink-0 flex-col justify-end px-4 py-3 sm:w-52 sm:pl-6 xl:w-60">
              <Skeleton className="h-3.5 w-16" />
            </div>
            <div className="flex w-28 shrink-0 flex-col justify-end gap-1.5 border-l border-border px-4 py-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-14" />
            </div>
            {COLUMNS.map((column) => (
              <div key={column} className="w-44 shrink-0 space-y-1.5 border-l border-border px-4 py-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
          {ROWS.map((row) => (
            <div key={row} className="flex h-14 items-center border-b border-border last:border-0">
              <div className="flex w-40 shrink-0 items-center gap-3 px-4 sm:w-52 sm:pl-6 xl:w-60">
                <Skeleton className="hidden size-8 rounded-full sm:block" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex h-full w-28 shrink-0 items-center border-l border-border px-4">
                <Skeleton className="h-4 w-10" />
              </div>
              {COLUMNS.map((column) => (
                <div key={column} className="flex h-full w-44 shrink-0 items-center border-l border-border px-4">
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/** Loading state for the cross-class Gradebook: header, class chips, then the grid. */
export function GradebookSkeleton() {
  return (
    <PageContainer aria-busy aria-label="Loading the gradebook">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="mb-6 flex gap-2">
        <Skeleton className="h-10 w-44 rounded-lg" />
        <Skeleton className="h-10 w-56 rounded-lg" />
      </div>
      <GradesSkeleton withClassHeader />
    </PageContainer>
  );
}
