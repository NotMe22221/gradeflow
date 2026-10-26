import { PageContainer } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/*
 * Loading skeletons that mirror each student page (and each Home section),
 * so nothing jumps when the data arrives. Rows use the same density
 * utilities as the real rows (py-row), so compact stays compact while
 * loading.
 */

function Box({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-xl border border-border bg-card", className)}>{children}</div>;
}

function RowSkeleton({ wide = false, due = true }: { wide?: boolean; due?: boolean }) {
  return (
    <div className="flex min-h-[4.5rem] items-center gap-4 px-4 py-row compact:min-h-14 sm:px-5">
      <Skeleton className="size-10 shrink-0 rounded-full compact:size-9" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className={cn("h-4 max-w-full", wide ? "w-72" : "w-56")} />
        <Skeleton className="h-3 w-24" />
      </div>
      {due ? (
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      ) : null}
    </div>
  );
}

/** A Home section's title row (title, description, link), as SectionHeading lays it out. */
function SectionHeadingSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="mb-3 flex min-h-10 items-center justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-72 max-w-full" />
      </div>
      {action ? <Skeleton className="h-4 w-20 shrink-0" /> : null}
    </div>
  );
}

/** The Home "progress" section (StudyProgress): streak and level side by side, then one line. */
export function ProgressSkeleton() {
  return (
    <div className="@container/progress">
      <Box>
        <div className="grid grid-cols-1 divide-y divide-border @min-[34rem]/progress:grid-cols-2 @min-[34rem]/progress:divide-x @min-[34rem]/progress:divide-y-0">
          {[0, 1].map((cell) => (
            <div key={cell} className="flex items-center gap-3 px-4 py-4 @min-[34rem]/progress:px-5">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40 max-w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-4 py-3 @min-[34rem]/progress:px-5">
          <Skeleton className="h-3.5 w-72 max-w-full" />
        </div>
      </Box>
    </div>
  );
}

/** The Home "inbox" section (AssignmentInbox): heading, tabs, rows, and the actions pane when there's room. */
export function InboxSkeleton() {
  return (
    <div className="@container/inbox">
      <SectionHeadingSkeleton />
      <Box className="overflow-hidden">
        <div className="flex h-12 items-center gap-8 border-b border-border px-6">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-14" />
        </div>
        <div className="grid @min-[48rem]/inbox:grid-cols-[minmax(0,7fr)_minmax(0,6fr)]">
          <div className="divide-y divide-border">
            {[0, 1, 2].map((row) => (
              <RowSkeleton key={row} />
            ))}
          </div>
          <div className="hidden space-y-4 border-l border-border p-6 @min-[48rem]/inbox:block">
            <div className="flex gap-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-64 max-w-full" />
                <Skeleton className="h-3.5 w-40" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full rounded-full" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10 rounded-full" />
              <Skeleton className="h-10 rounded-full" />
            </div>
          </div>
        </div>
      </Box>
    </div>
  );
}

/** The Home "planner" section (GoalPlanner): heading, the form, and the result area. */
export function PlannerSkeleton() {
  return (
    <div>
      <SectionHeadingSkeleton action={false} />
      <Box className="overflow-hidden">
        <div className="space-y-3 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[15rem_minmax(0,1fr)_auto] sm:items-end">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-full sm:w-28" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
        <div className="border-t border-border px-4 py-6 sm:px-5">
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </Box>
    </div>
  );
}

/** Mirrors the To-do page: heading and class filter, tabs, grouped rows. */
export function StudentTodoSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-10 sm:px-6 sm:pt-8" aria-busy aria-label="Loading your to-do list">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="w-full space-y-1.5 sm:w-60">
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
      <div className="mt-6 flex h-12 items-center gap-8 border-b border-border px-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="space-y-6 pt-6 compact:space-y-4">
        {[2, 1].map((rows, group) => (
          <div key={group}>
            <div className="flex min-h-10 items-center gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Box className="mt-2 divide-y divide-border overflow-hidden">
              {Array.from({ length: rows }, (_, row) => (
                <RowSkeleton key={row} wide />
              ))}
            </Box>
          </div>
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
      <div className="mt-6 grid grid-cols-1 gap-6 @min-[44rem]:grid-cols-[15rem_minmax(0,1fr)]">
        <Box className="space-y-3 p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-4 w-full" />
          <div className="flex justify-end">
            <Skeleton className="h-4 w-14" />
          </div>
        </Box>
        <div className="space-y-3">
          {[0, 1, 2].map((card) => (
            <Box key={card} className="flex items-center gap-4 px-4 py-row sm:px-5">
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

/** Mirrors a class's Classwork: "View your work", then a topic with flat rows. */
export function StudentClassworkSkeleton() {
  return (
    <PageContainer className="max-w-5xl space-y-8" aria-busy aria-label="Loading classwork">
      <Skeleton className="h-10 w-40 rounded-full" />
      <div>
        <div className="mb-2 flex items-end justify-between border-b border-border pb-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <div className="space-y-0.5">
          {[0, 1, 2, 3].map((row) => (
            <RowSkeleton key={row} wide due={false} />
          ))}
        </div>
      </div>
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
              <div key={row} className="flex min-h-row-min items-center gap-4 px-2 py-2 sm:px-4">
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

/** Mirrors the assignment page: breadcrumbs, header and instructions, Your work beside them when there's room. */
export function StudentAssignmentSkeleton() {
  return (
    <>
      {/* Holds the place of the class accent rule, so the page doesn't shift when it arrives. */}
      <div aria-hidden className="h-1" />
      <PageContainer className="max-w-5xl" aria-busy aria-label="Loading assignment">
        <Skeleton className="mb-6 h-6 w-72 max-w-full rounded-full" />
        <div className="grid grid-cols-1 gap-8 @min-[52rem]:grid-cols-[minmax(0,1fr)_20rem] @min-[52rem]:grid-rows-[auto_1fr] @min-[52rem]:items-start @min-[52rem]:gap-x-10">
          <div className="min-w-0 @min-[52rem]:col-start-1 @min-[52rem]:row-start-1">
            <div className="flex gap-4">
              <Skeleton className="mt-1 size-10 shrink-0 rounded-full max-sm:hidden" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-8 w-96 max-w-full" />
                <Skeleton className="h-4 w-44" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </div>
            <Skeleton className="mt-4 h-px w-full" />
          </div>
          <Box className="space-y-4 p-5 @min-[52rem]:col-start-2 @min-[52rem]:row-span-2 @min-[52rem]:row-start-1">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <Skeleton className="h-10 w-full rounded-full" />
            <Skeleton className="h-10 w-full rounded-full" />
          </Box>
          <div className="min-w-0 space-y-6 @min-[52rem]:col-start-1 @min-[52rem]:row-start-2">
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
    </>
  );
}
