import { PageContainer } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the student home layout so nothing jumps when data arrives. */
export function StudentHomeSkeleton() {
  return (
    <PageContainer className="max-w-4xl" aria-busy aria-label="Loading your assignments">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="space-y-6">
        {[3, 2].map((rows, card) => (
          <Card key={card} className="overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
              <div className="space-y-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-56 max-w-full" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: rows }, (_, row) => (
                <div key={row} className="flex items-center gap-4 px-4 py-4 sm:px-6">
                  <Skeleton className="hidden size-9 rounded-lg sm:block" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-64 max-w-full" />
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}

/** Mirrors the assignment page: header, instructions, rubric, and state card. */
export function StudentAssignmentSkeleton() {
  return (
    <PageContainer aria-busy aria-label="Loading assignment">
      <Skeleton className="mb-6 h-4 w-36" />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-96 max-w-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card className="space-y-3 p-6">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </Card>
          <Card className="space-y-4 p-6">
            <Skeleton className="h-9 w-64 max-w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-md" />
            <div className="flex justify-end">
              <Skeleton className="h-9 w-32" />
            </div>
          </Card>
        </div>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="divide-y divide-border">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="space-y-2 px-5 py-4">
                <div className="flex justify-between gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
