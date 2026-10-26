import { PageContainer } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/*
 * Loading skeletons that mirror each student page, so nothing jumps when
 * the data arrives.
 */

function Box({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-xl border border-border bg-card", className)}>{children}</div>;
}

function RowSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex min-h-[72px] items-center gap-4 px-4 py-3 sm:px-5">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className={cn("h-4 max-w-full", wide ? "w-72" : "w-56")} />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-3.5 w-20 shrink-0" />
    </div>
  );
}

function ClassCardSkeleton() {
  return (
    <Box className="relative flex min-h-[18.5rem] flex-col overflow-hidden">
      <div className="h-[104px] space-y-2 bg-muted px-4 pt-4">
        <Skeleton className="h-6 w-40 bg-foreground/[0.07]" />
        <Skeleton className="h-4 w-28 bg-foreground/[0.07]" />
        <Skeleton className="h-3.5 w-24 bg-foreground/[0.07]" />
      </div>
      <Skeleton className="absolute top-[4.5rem] right-4 size-16 rounded-full ring-4 ring-card" />
      <div className="flex-1 space-y-3 px-4 pt-4 pr-24">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="flex justify-end gap-1 border-t border-border px-2 py-1.5">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="size-10 rounded-full" />
      </div>
    </Box>
  );
}

/** Mirrors the student Home: progress strip, class cards, inbox, goal planner. */
export function StudentHomeSkeleton() {
  return (
    <PageContainer className="space-y-8" aria-busy aria-label="Loading your Home">
      <Box>
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 md:flex-row md:items-center md:gap-6">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-56 max-w-full" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:flex md:gap-6">
            {[0, 1].map((tile) => (
              <div key={tile} className="flex items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-28 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end border-t border-border px-4 py-3 sm:px-5">
          <Skeleton className="h-3.5 w-64 max-w-full" />
        </div>
      </Box>

      <div className="grid grid-cols-1 gap-6 min-[600px]:grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]">
        <ClassCardSkeleton />
        <ClassCardSkeleton />
      </div>

      <Box className="overflow-hidden">
        <div className="space-y-2 px-4 pt-4 sm:px-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="mt-2 flex gap-6 border-b border-border px-5 py-3.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,6fr)]">
          <div className="divide-y divide-border">
            {[0, 1, 2].map((row) => (
              <RowSkeleton key={row} />
            ))}
          </div>
          <div className="hidden space-y-4 border-l border-border p-6 lg:block">
            <div className="flex gap-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-64 max-w-full" />
                <Skeleton className="h-3.5 w-40" />
              </div>
            </div>
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-full" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10 rounded-full" />
              <Skeleton className="h-10 rounded-full" />
            </div>
          </div>
        </div>
      </Box>

      <Box className="overflow-hidden">
        <div className="flex gap-4 px-4 pt-4 sm:px-5">
          <Skeleton className="size-10 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
        </div>
        <div className="grid gap-3 px-4 py-5 sm:grid-cols-[15rem_minmax(0,1fr)_auto] sm:items-end sm:px-5">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-full sm:w-28" />
        </div>
        <div className="border-t border-border px-4 py-6 sm:px-5">
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </Box>
    </PageContainer>
  );
}

/** Mirrors the To-do page: tab bar, class filter, grouped rows. */
export function StudentTodoSkeleton() {
  return (
    <div aria-busy aria-label="Loading your to-do list">
      <div className="sticky top-16 z-30 border-b border-border bg-card">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center gap-8 px-6 lg:px-8">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-10 w-full rounded-lg sm:w-64" />
        </div>
        {[2, 1].map((rows, group) => (
          <Box key={group} className="overflow-hidden">
            <div className="flex min-h-14 items-center justify-between px-4 sm:px-5">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-8" />
            </div>
            <div className="divide-y divide-border border-t border-border">
              {Array.from({ length: rows }, (_, row) => (
                <RowSkeleton key={row} wide />
              ))}
            </div>
          </Box>
        ))}
      </div>
    </div>
  );
}

/** Mirrors a class Stream: banner, Upcoming, feed cards. */
export function StudentStreamSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      aria-busy
      aria-label="Loading the class stream"
    >
      <div className="flex min-h-40 flex-col justify-end gap-2 rounded-2xl bg-muted px-6 py-6 sm:min-h-52 sm:px-8 sm:py-8">
        <Skeleton className="h-9 w-56 max-w-full bg-foreground/[0.07]" />
        <Skeleton className="h-5 w-48 max-w-full bg-foreground/[0.07]" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[13.5rem_minmax(0,1fr)]">
        <Box className="space-y-3 p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full" />
          <div className="flex justify-end">
            <Skeleton className="h-4 w-14" />
          </div>
        </Box>
        <div className="space-y-3">
          {[0, 1, 2].map((card) => (
            <Box key={card} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-80 max-w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </Box>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mirrors a class's Classwork: "View your work", then the assignment list. */
export function StudentClassworkSkeleton() {
  return (
    <PageContainer className="max-w-5xl space-y-6" aria-busy aria-label="Loading classwork">
      <Skeleton className="h-10 w-40 rounded-full" />
      <Box className="divide-y divide-border overflow-hidden">
        {[0, 1, 2, 3].map((row) => (
          <RowSkeleton key={row} wide />
        ))}
      </Box>
    </PageContainer>
  );
}

/** Mirrors People: Teachers and Classmates. */
export function StudentPeopleSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-10 px-4 py-6 sm:px-6 sm:py-10"
      aria-busy
      aria-label="Loading people"
    >
      {[1, 4].map((count, section) => (
        <div key={section}>
          <div className="flex min-h-16 items-end border-b border-border pb-3">
            <Skeleton className="h-8 w-40" />
          </div>
          <div className="mt-2 divide-y divide-border">
            {Array.from({ length: count }, (_, row) => (
              <div key={row} className="flex min-h-14 items-center gap-4 px-2 py-2 sm:px-4">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Mirrors the assignment page: header and instructions on the left, Your work on the right. */
export function StudentAssignmentSkeleton() {
  return (
    <PageContainer className="max-w-5xl" aria-busy aria-label="Loading assignment">
      <Skeleton className="mb-6 h-7 w-44 rounded-full" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-10">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="flex gap-4">
            <Skeleton className="mt-1 size-10 shrink-0 rounded-full max-sm:hidden" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-8 w-96 max-w-full" />
              <Skeleton className="h-4 w-36" />
              <div className="flex justify-between pt-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
          <Skeleton className="mt-4 h-px w-full" />
        </div>
        <Box className="space-y-4 p-5 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
        </Box>
        <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-2">
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <Box className="divide-y divide-border overflow-hidden">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex gap-3 px-4 py-4 sm:px-5">
                <Skeleton className="size-6 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3.5 w-full" />
                </div>
              </div>
            ))}
          </Box>
        </div>
      </div>
    </PageContainer>
  );
}
