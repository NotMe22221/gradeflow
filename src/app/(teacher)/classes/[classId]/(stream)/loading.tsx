import { Skeleton } from "@/components/ui/skeleton";

/**
 * Stream skeleton: banner, Upcoming and tools cards, composer, activity cards.
 * It sits in the (stream) route group beside the Stream page so it covers only
 * the Stream: Classwork, People, Grades, student profiles, and the builder
 * show their own skeletons under the class tab bar.
 */
export default function ClassStreamLoading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      aria-busy="true"
      aria-label="Loading class"
    >
      <div className="flex min-h-40 flex-col justify-end space-y-2 rounded-2xl bg-muted px-6 py-6 sm:min-h-52 sm:px-8 sm:py-8">
        <Skeleton className="h-9 w-56 max-w-full bg-foreground/[0.07]" />
        <Skeleton className="h-5 w-48 max-w-full bg-foreground/[0.07]" />
        <Skeleton className="mt-1 h-4 w-24 bg-foreground/[0.07]" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[13.5rem_minmax(0,1fr)]">
        <div className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2 md:grid-cols-1">
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-4 w-20" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <Skeleton className="ml-auto h-4 w-14" />
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-4 w-28" />
            {[0, 1].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 sm:px-5">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 w-52 max-w-[50%]" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex items-start gap-4 rounded-xl border border-border bg-card px-4 py-3.5 sm:px-5">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2 pt-1">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
