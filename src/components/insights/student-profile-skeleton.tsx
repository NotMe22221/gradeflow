import { PageContainer } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading state that mirrors the student page: header, stats, brief, grades, side cards. */
export function StudentProfileSkeleton() {
  return (
    <PageContainer aria-busy aria-label="Loading student">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3.5 w-48" />
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-7 w-48" />
          </div>
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <Card key={tile} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="size-7 rounded-lg" />
            </div>
            <Skeleton className="mt-2 h-7 w-14" />
            <Skeleton className="mt-2 h-3 w-28 max-w-full" />
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-80 max-w-full" />
              </div>
              <Skeleton className="h-6 w-36 rounded-full" />
            </div>
            <div className="px-6 pb-6">
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </Card>
          <Card>
            <div className="space-y-2 px-6 pt-6 pb-4">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-4 border-t border-border px-6 py-3">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-6 w-12 rounded-md" />
                <Skeleton className="hidden h-4 w-14 sm:block" />
              </div>
            ))}
          </Card>
        </div>
        <div className="min-w-0 space-y-6">
          {[0, 1, 2].map((card) => (
            <Card key={card}>
              <div className="space-y-2 px-6 pt-6 pb-4">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-52 max-w-full" />
              </div>
              <div className="space-y-3 px-6 pb-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
