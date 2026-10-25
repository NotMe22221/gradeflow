import { PageContainer } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the student dashboard (header, inbox, planner) so nothing jumps when data arrives. */
export function StudentHomeSkeleton() {
  return (
    <PageContainer className="space-y-6 lg:space-y-8" aria-busy aria-label="Loading your dashboard">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-64 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[32rem] lg:shrink-0">
            {[0, 1].map((tile) => (
              <div key={tile} className="flex items-center gap-3 rounded-xl border border-border p-4">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border bg-muted/40 px-5 py-3 sm:px-6">
          <div className="hidden gap-2 md:flex">
            <Skeleton className="h-6 w-44 rounded-full" />
            <Skeleton className="h-6 w-36 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-64 max-w-full" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="space-y-2 border-b border-border px-5 py-4 sm:px-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,6fr)]">
          <div className="space-y-2 p-4 sm:p-5">
            <Skeleton className="h-9 w-full rounded-lg" />
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex items-start gap-3 px-3 py-3">
                <Skeleton className="hidden size-8 rounded-lg sm:block" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-64 max-w-full" />
                  <Skeleton className="h-3.5 w-36" />
                </div>
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            ))}
          </div>
          <div className="hidden space-y-4 border-l border-border bg-muted/30 p-6 lg:block">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-6 w-72 max-w-full" />
            <Skeleton className="h-4 w-48" />
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((button) => (
                <Skeleton key={button} className="h-9 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-36 w-full rounded-lg" />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="space-y-2 border-b border-border px-5 py-4 sm:px-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="grid gap-3 px-5 py-5 sm:grid-cols-[13rem_minmax(0,1fr)_auto] sm:items-end sm:px-6">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full sm:w-24" />
        </div>
        <div className="border-t border-border px-5 py-6 sm:px-6">
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </Card>
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
