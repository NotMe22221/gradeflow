import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DEFAULT_PREFERENCES } from "@/lib/preferences/schema";
import { getViewerPreferences } from "@/lib/preferences/server";

/** Home's skeleton in the teacher's saved arrangement (one small read), so the page doesn't jump when it loads. */
export default async function DashboardLoading() {
  const preferences = await getViewerPreferences().catch(() => DEFAULT_PREFERENCES);
  return <DashboardSkeleton layout={preferences.layout.teacherHome} />;
}
