import { Skeleton } from "@/components/ui/skeleton";

const PAPER_LINES = ["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-10/12", "w-3/5"];

/** Loading state that mirrors the grading tool: header, grading list, paper, grade panel. */
export function ReviewSkeleton() {
  return (
    <div
      className="@container relative flex min-h-[calc(100dvh-4rem)] flex-col lg:h-[calc(100dvh-4rem)] lg:min-h-0 lg:overflow-hidden"
      aria-busy
      aria-label="Loading the papers to review"
    >
      <div className="border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1 basis-44 space-y-2">
            <Skeleton className="h-7 w-36 max-w-full" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
          <div className="order-last flex w-full items-center gap-2 @6xl:order-none @6xl:w-auto">
            <Skeleton className="h-10 min-w-0 flex-1 rounded-full sm:w-60 sm:flex-none" />
            <Skeleton className="h-10 w-36 shrink-0 rounded-full sm:w-52" />
          </div>
          <div className="flex w-full items-center gap-1 sm:ml-auto sm:w-auto">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <Skeleton className="h-12 min-w-0 flex-1 rounded-full sm:w-64 sm:flex-none" />
            <Skeleton className="size-10 shrink-0 rounded-full" />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-64 shrink-0 flex-col gap-1 border-r border-border bg-card px-2 py-4 @6xl:flex">
          <div className="space-y-1.5 px-2 pb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
          <div className="min-w-0 flex-1 bg-background lg:overflow-hidden">
            <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 lg:py-6">
              <div className="mb-5 flex items-start gap-3">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-64 max-w-full" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3 border-b border-border px-5 py-2.5">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="ml-auto h-3 w-16" />
                </div>
                <div className="space-y-6 px-5 py-7 sm:px-10 sm:py-10">
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
          </div>

          <div className="hidden min-h-0 flex-col border-l border-border bg-card lg:flex lg:w-[min(30rem,48%)]">
            <div className="space-y-2.5 border-b border-border px-5 pt-3 pb-4">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-3.5 w-12" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-28 rounded-md" />
                  <Skeleton className="h-5 w-24 rounded-md" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-7 w-28 rounded-full" />
              </div>
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            <div className="flex-1 space-y-3 overflow-hidden px-5 py-5">
              <Skeleton className="h-4 w-20" />
              {[0, 1, 2].map((card) => (
                <div key={card} className="space-y-4 rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start gap-3">
                    <Skeleton className="size-7 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-6 w-28 rounded-full" />
                    </div>
                    <Skeleton className="h-11 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 border-t border-border px-5 py-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="ml-auto h-10 w-32 rounded-full" />
              <Skeleton className="h-10 w-44 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
