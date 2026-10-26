import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ListCardSkeleton({ rows }: { rows: number }) {
  return (
    <Card>
      <div className="space-y-2 px-5 pt-5 pb-4 sm:px-6">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-52 max-w-full" />
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-3 border-t border-border px-5 py-3.5 sm:px-6">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </Card>
  );
}

/** Loading state that mirrors the student page: avatar header, stat strip, brief, grades, side cards. */
export function StudentProfileSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Loading student"
      className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
    >
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 sm:gap-5">
          <Skeleton className="size-16 shrink-0 rounded-full sm:size-20" />
          <div className="space-y-2.5">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-56 max-w-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40 rounded-full" />
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border @3xl:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <div key={tile} className="flex min-w-0 flex-col gap-2 bg-card p-4 sm:p-5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-3 w-24 max-w-full" />
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 @4xl:grid-cols-3">
        <div className="min-w-0 space-y-6 @4xl:col-span-2">
          <Card>
            <div className="flex items-start gap-4 px-5 pt-5 pb-4 sm:px-6">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-80 max-w-full" />
              </div>
              <Skeleton className="hidden h-7 w-28 rounded-full sm:block" />
            </div>
            <div className="px-5 pb-6 sm:px-6">
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </Card>
          <ListCardSkeleton rows={2} />
        </div>
        <div className="min-w-0 space-y-6">
          <ListCardSkeleton rows={3} />
          <ListCardSkeleton rows={3} />
        </div>
      </div>
    </div>
  );
}
