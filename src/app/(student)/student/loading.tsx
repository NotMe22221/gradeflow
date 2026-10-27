import { ClassCardGridSkeleton } from "@/components/classes/class-card-skeleton";
import { MAIN_ONLY_SECTIONS } from "@/components/layout-editor/model";
import { SectionsSkeleton } from "@/components/layout-editor/sections-skeleton";
import { PageContainer } from "@/components/page-header";
import {
  GreetingSkeleton,
  InboxSkeleton,
  PlannerSkeleton,
  ProgressSkeleton,
} from "@/components/student/student-skeletons";
import { DEFAULT_PREFERENCES } from "@/lib/preferences/schema";
import { getViewerPreferences } from "@/lib/preferences/server";

/** The student Home's skeleton in the student's saved arrangement, so nothing jumps on load. */
export default async function StudentHomeLoading() {
  const preferences = await getViewerPreferences().catch(() => DEFAULT_PREFERENCES);
  return (
    <PageContainer aria-busy aria-label="Loading your Home">
      <GreetingSkeleton />
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
