import { PageContainer } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClassworkLoading() {
  return (
    <PageContainer className="max-w-5xl" aria-busy="true" aria-label="Loading classwork">
      <div className="mb-8 flex items-center justify-between gap-3">
        <Skeleton className="h-12 w-32 rounded-full" />
        <Skeleton className="hidden h-4 w-56 sm:block" />
      </div>
      {[3, 1].map((count, group) => (
        <div key={group} className="mb-10">
          <div className="mb-2 flex items-end justify-between border-b border-border pb-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          {/* Flat rows, like the list: no card until a row is opened. */}
          <div className="space-y-0.5">
            {Array.from({ length: count }, (_, index) => (
              <div key={index} className="flex min-h-row-min items-center gap-4 px-3 py-row sm:px-4">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4 max-w-md" />
                  <Skeleton className="h-3 w-24 sm:hidden" />
                </div>
                <Skeleton className="hidden h-4 w-20 sm:block" />
                <Skeleton className="size-5 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </PageContainer>
  );
}
