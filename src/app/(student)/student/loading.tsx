import { ClassCardGridSkeleton } from "@/components/classes/class-card-skeleton";
import { MAIN_ONLY_SECTIONS } from "@/components/layout-editor/model";
import { SectionsSkeleton } from "@/components/layout-editor/sections-skeleton";
import { PageContainer } from "@/components/page-header";
import { InboxSkeleton, PlannerSkeleton, ProgressSkeleton } from "@/components/student/student-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_PREFERENCES } from "@/lib/preferences/schema";
import { getViewerPreferences } from "@/lib/preferences/server";

/** The student Home's skeleton in the student's saved arrangement, so nothing jumps on load. */
export default async function StudentHomeLoading() {
  const preferences = await getViewerPreferences().catch(() => DEFAULT_PREFERENCES);
  return (
    <PageContainer aria-busy aria-label="Loading your Home">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="col-start-2 row-start-1 h-8 w-32 rounded-full sm:row-span-2 sm:self-end" />
        <Skeleton className="col-span-2 h-8 w-64 max-w-full sm:col-span-1" />
        <Skeleton className="col-span-2 h-4 w-56 max-w-full" />
      </div>
      <SectionsSkeleton
        className="mt-8"
        layout={preferences.layout.studentHome}
        sections={{
          progress: { node: <ProgressSkeleton /> },
          classes: { node: <ClassCardGridSkeleton count={2} />, action: true },
          inbox: { node: <InboxSkeleton />, ownHeading: true, mainOnly: MAIN_ONLY_SECTIONS.studentHome.includes("inbox") },
          planner: {
            node: <PlannerSkeleton />,
            ownHeading: true,
            mainOnly: MAIN_ONLY_SECTIONS.studentHome.includes("planner"),
          },
        }}
      />
    </PageContainer>
  );
}
