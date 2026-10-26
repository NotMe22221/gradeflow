import { ReviewSkeleton } from "@/components/review/review-skeleton";
import { DEFAULT_PREFERENCES } from "@/lib/preferences/schema";
import { getViewerPreferences } from "@/lib/preferences/server";

/** The grading tool's skeleton in the teacher's saved layout (paper left or right), so nothing jumps on load. */
export default async function ReviewLoading() {
  const preferences = await getViewerPreferences().catch(() => DEFAULT_PREFERENCES);
  return <ReviewSkeleton paperSide={preferences.layout.reviewPaperSide} />;
}
