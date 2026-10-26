import { ClassCardGridSkeleton } from "@/components/classes/class-card-skeleton";
import { SectionsSkeleton } from "@/components/layout-editor/sections-skeleton";
import { PageContainer } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { defaultSectionLayout, type SectionLayout } from "@/lib/preferences/schema";

function ListCardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, row) => (
          <div
            key={row}
            className="flex min-h-row-min items-center gap-3 px-5 py-row"
          >
            <Skeleton className="size-9 rounded-full compact:size-8" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36 max-w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="ml-auto h-4 w-10" />
              <Skeleton className="ml-auto h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 divide-y divide-border rounded-xl border border-border bg-card @min-[36rem]:grid-cols-3 @min-[36rem]:divide-x @min-[36rem]:divide-y-0">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-4 px-4 py-3 @min-[36rem]:block @min-[36rem]:space-y-2 @min-[36rem]:px-5 @min-[36rem]:py-4"
        >
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-40 max-w-full @min-[36rem]:hidden" />
          </div>
          <Skeleton className="h-7 w-14" />
          <Skeleton className="hidden h-3 w-40 max-w-full @min-[36rem]:block" />
        </div>
      ))}
    </div>
  );
}

function ToolsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border @min-[36rem]:grid-cols-2 @min-[58rem]:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={
            index === 2
              ? "bg-card p-4 @min-[36rem]:col-span-2 @min-[36rem]:p-5 @min-[58rem]:col-span-1"
              : "bg-card p-4 @min-[36rem]:p-5"
          }
        >
          <div className="flex items-start gap-4">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2 pt-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
          {index === 2 ? <Skeleton className="mt-3 h-10 w-full rounded-lg @min-[36rem]:ml-14 @min-[36rem]:w-auto" /> : null}
        </div>
      ))}
    </div>
  );
}

/** Loading state in the shape of the teacher's saved Home, so nothing jumps on load. */
export function DashboardSkeleton({ layout = defaultSectionLayout("teacherHome") }: { layout?: SectionLayout }) {
  return (
    <PageContainer aria-busy aria-label="Loading Home">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="col-start-2 row-start-1 h-8 w-32 rounded-full sm:row-span-2 sm:self-end" />
        <Skeleton className="col-span-2 h-8 w-64 max-w-full sm:col-span-1" />
      </div>

      {/* The notice */}
      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-4 sm:px-5">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-3.5 w-96 max-w-full" />
        </div>
        <Skeleton className="hidden h-10 w-36 rounded-full sm:block" />
      </div>

      <SectionsSkeleton
        className="mt-10"
        layout={layout}
        sections={{
          stats: { node: <StatsSkeleton /> },
          tools: { node: <ToolsSkeleton /> },
          classes: { node: <ClassCardGridSkeleton count={2} />, action: true },
          recent: { node: <ListCardSkeleton rows={5} />, action: true },
          missed: { node: <ListCardSkeleton rows={3} />, action: true },
        }}
      />
    </PageContainer>
  );
}
