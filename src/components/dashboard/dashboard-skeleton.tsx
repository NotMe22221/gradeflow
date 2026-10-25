import { PageContainer } from "@/components/page-header";
import { Card, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading state that mirrors the dashboard layout so nothing jumps on load. */
export function DashboardSkeleton() {
  return (
    <PageContainer aria-busy aria-label="Loading your dashboard">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
        <Skeleton className="h-9 w-44" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Card key={index} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
            <Skeleton className="mt-3 h-8 w-20" />
            <Skeleton className="mt-3 h-4 w-48 max-w-full" />
          </Card>
        ))}
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <div className="mb-4 flex h-8 items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {[0, 1].map((index) => (
              <Card key={index}>
                <div className="space-y-6 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <Skeleton className="h-5 w-36 max-w-full" />
                      <Skeleton className="h-4 w-28 max-w-full" />
                    </div>
                    <Skeleton className="h-7 w-24 shrink-0 rounded-full" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[0, 1, 2].map((metric) => (
                      <div key={metric} className="space-y-1.5">
                        <Skeleton className="h-3 w-14" />
                        <Skeleton className="h-5 w-8" />
                      </div>
                    ))}
                  </div>
                  <Skeleton className="h-4 w-52 max-w-full" />
                </div>
                <CardFooter className="justify-between px-4 py-3">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-20" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-4 flex h-8 items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Card className="overflow-hidden">
            <div className="divide-y divide-border">
              {[0, 1, 2, 3, 4].map((row) => (
                <div key={row} className="flex items-center gap-3 px-5 py-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36 max-w-full" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="ml-auto h-4 w-12" />
                    <Skeleton className="ml-auto h-3 w-10" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
