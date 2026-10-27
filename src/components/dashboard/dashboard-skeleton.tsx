import { ClassCardGridSkeleton } from "@/components/classes/class-card-skeleton";
import { GREETING_HEADING, GreetingBandFrame } from "@/components/dashboard/greeting-band";
import { SectionsSkeleton } from "@/components/layout-editor/sections-skeleton";
import { PageContainer } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { defaultSectionLayout, type SectionLayout } from "@/lib/preferences/schema";

function ListCardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
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

/** Stand-in bars on a band: a shade of the band's own text color, so they read on any band (and in Calm). */
const ON_BAND = "bg-band-foreground/10";

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 @min-[36rem]:grid-cols-3">
      {["bg-band-mint", "bg-band-sky", "bg-band-lilac"].map((band) => (
        <div
          key={band}
          className={`flex items-center justify-between gap-4 rounded-3xl px-5 py-4 @min-[36rem]:block @min-[36rem]:space-y-3 @min-[36rem]:px-6 @min-[36rem]:pt-5 @min-[36rem]:pb-6 ${band}`}
        >
          <div className="space-y-2">
            <Skeleton className={`h-4 w-28 ${ON_BAND}`} />
            <Skeleton className={`h-3.5 w-40 max-w-full @min-[36rem]:hidden ${ON_BAND}`} />
          </div>
          <Skeleton className={`h-9 w-14 @min-[36rem]:h-12 @min-[36rem]:w-20 ${ON_BAND}`} />
          <Skeleton className={`hidden h-3.5 w-40 max-w-full @min-[36rem]:block ${ON_BAND}`} />
        </div>
      ))}
    </div>
  );
}

function ToolsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 @min-[36rem]:grid-cols-2 @min-[58rem]:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={
            index === 2
              ? "rounded-3xl border border-border bg-card p-5 @min-[36rem]:col-span-2 @min-[58rem]:col-span-1"
              : "rounded-3xl border border-border bg-card p-5"
          }
        >
          <div className="flex items-start gap-4">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2 pt-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
          {index === 2 ? <Skeleton className="mt-4 h-10 w-full rounded-lg @min-[36rem]:ml-16 @min-[36rem]:w-auto" /> : null}
        </div>
      ))}
    </div>
  );
}

/** Loading state in the shape of the teacher's saved Home, so nothing jumps on load. */
export function DashboardSkeleton({ layout = defaultSectionLayout("teacherHome") }: { layout?: SectionLayout }) {
  return (
    <PageContainer aria-busy aria-label="Loading Home">
      <GreetingBandFrame as="div">
        <div className="col-start-1 row-start-1 flex h-8 items-center">
          <Skeleton className={`h-4 w-36 ${ON_BAND}`} />
        </div>
        <Skeleton className={`col-start-2 row-start-1 h-8 w-28 rounded-full ${ON_BAND}`} />
        {/* Two lines of the heading, sized in em so they follow the display type. */}
        <div className={GREETING_HEADING}>
          <Skeleton className={`h-[0.86em] w-[5.5em] max-w-full ${ON_BAND}`} />
          <Skeleton className={`mt-[0.18em] h-[0.86em] w-[7em] max-w-full ${ON_BAND}`} />
        </div>
      </GreetingBandFrame>

      {/* The notice */}
      <div className="mt-6 flex items-center gap-4 rounded-3xl border border-border bg-card p-4 sm:p-5 sm:pr-6">
        <Skeleton className="size-12 shrink-0 rounded-2xl" />
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
