import { Skeleton } from "@/components/ui/skeleton";

function HeadingSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex min-h-16 items-end justify-between border-b border-primary/40 pb-2">
      <Skeleton className="h-9 w-36" />
      {withAction ? <Skeleton className="h-10 w-36 rounded-full" /> : null}
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex min-h-14 items-center gap-4 px-2 py-2 sm:px-4">
      <Skeleton className="size-9 rounded-full" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

/** People skeleton: Teachers and Students headings over their rows. */
export default function ClassPeopleLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10" aria-busy="true" aria-label="Loading people">
      <HeadingSkeleton />
      <div className="mt-2">
        <RowSkeleton />
      </div>
      <div className="mt-10">
        <HeadingSkeleton withAction />
        <div className="mt-2 divide-y divide-border">
          {Array.from({ length: 6 }, (_, index) => (
            <RowSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
