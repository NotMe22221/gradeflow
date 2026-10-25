import { Skeleton } from "@/components/ui/skeleton";

const PAPER_LINES = ["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-10/12", "w-3/5"];

/** Loading state that mirrors the review split view. */
export function ReviewSkeleton() {
  return (
    <div
      className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:h-[calc(100dvh-3.5rem)] lg:min-h-0"
      aria-busy
      aria-label="Loading the review queue"
    >
      <div className="border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="mr-auto space-y-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
          <div className="order-last flex w-full flex-wrap items-center gap-2 lg:order-none lg:w-auto">
            <Skeleton className="h-9 flex-1 sm:w-52 sm:flex-none" />
            <Skeleton className="h-9 flex-1 sm:w-48 sm:flex-none" />
            <Skeleton className="hidden h-8 w-44 lg:block" />
          </div>
          <Skeleton className="ml-auto h-8 w-32" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-w-0 flex-1 bg-background lg:overflow-hidden">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 lg:py-8">
            <div className="mb-6 flex items-start gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64 max-w-full" />
                <Skeleton className="h-3.5 w-52 max-w-full" />
              </div>
            </div>
            <div className="space-y-6 rounded-xl border border-border bg-card px-5 py-6 shadow-card sm:px-10 sm:py-10">
              {[0, 1, 2].map((paragraph) => (
                <div key={paragraph} className="mx-auto max-w-prose space-y-3">
                  {PAPER_LINES.map((width, index) => (
                    <Skeleton key={index} className={`h-3.5 ${width}`} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden min-h-0 flex-col border-l border-border bg-background lg:flex lg:w-1/2 2xl:w-[min(600px,48%)]">
          <div className="flex items-start justify-between gap-6 border-b border-border bg-card px-6 py-4">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-28 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="flex-1 space-y-4 overflow-hidden px-6 py-5">
            {[0, 1, 2].map((card) => (
              <div key={card} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-6 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-28 rounded-full" />
                  </div>
                  <Skeleton className="h-10 w-24" />
                </div>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 border-t border-border bg-card px-6 py-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="ml-auto h-9 w-28" />
            <Skeleton className="h-9 w-44" />
          </div>
        </div>
      </div>
    </div>
  );
}
