import type { Metadata } from "next";

import { buildClassCards } from "@/components/student/class-card";
import { StudentHomeView } from "@/components/student/home-view";
import { inboxSummary } from "@/components/student/inbox-model";
import { requireStudentPage } from "@/lib/auth/session";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";
import { getStudentEngagement } from "@/lib/gamification/engagement";
import { goalEngineInfo } from "@/lib/goals/planner";
import { firstName } from "@/lib/format";
import { getPreferences } from "@/lib/preferences/server";

import { loadSavedPlans, loadStudentDashboard } from "./data";

export const metadata: Metadata = { title: "Home" };

/** "Monday, October 26": today in the viewer's zone (undefined: the server's). */
function todayLabel(now: Date, timeZone: string | undefined): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone }).format(now);
}

export default async function StudentHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const student = await requireStudentPage();
  const now = new Date();
  const [timeZone, preferences, params] = await Promise.all([
    viewerTimeZone(),
    getPreferences(student.id),
    searchParams,
  ]);

  // Only this student's own classes, submissions, teacher-approved grades,
  // and XP. No AI suggestion, confidence, or flag ever reaches this page.
  const [dashboard, engagement] = await Promise.all([
    loadStudentDashboard(student.id, now, timeZone),
    getStudentEngagement(student.id, now),
  ]);
  const savedPlans = await loadSavedPlans(student.id, dashboard.goalClasses);

  const summary =
    dashboard.classes.length === 0 ? "Your classes and assignments will show up here." : inboxSummary(dashboard.inbox);

  return (
    <StudentHomeView
      firstName={firstName(student.name)}
      today={todayLabel(now, timeZone)}
      summary={summary}
      engagement={engagement}
      cards={buildClassCards(dashboard.classes, dashboard.inbox, now, timeZone)}
      inbox={dashboard.inbox}
      plannerClasses={dashboard.classes.map(({ id, name, section }) => ({ id, name, section }))}
      savedPlans={savedPlans}
      engine={goalEngineInfo()}
      layout={preferences.layout.studentHome}
      classOrder={preferences.layout.classOrder}
      startEditing={params.customize === "1"}
    />
  );
}
