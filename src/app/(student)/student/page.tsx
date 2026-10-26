import type { Metadata } from "next";

import { buildClassCards } from "@/components/student/class-card";
import { StudentHomeView } from "@/components/student/home-view";
import { inboxSummary } from "@/components/student/inbox-model";
import { requireStudentPage } from "@/lib/auth/session";
import { getStudentEngagement } from "@/lib/gamification/engagement";
import { goalEngineInfo } from "@/lib/goals/planner";
import { firstName } from "@/lib/format";

import { loadSavedPlans, loadStudentDashboard } from "./data";

export const metadata: Metadata = { title: "Home" };

export default async function StudentHomePage() {
  const student = await requireStudentPage();
  const now = new Date();

  // Only this student's own classes, submissions, teacher-approved grades,
  // and XP. No AI suggestion, confidence, or flag ever reaches this page.
  const [dashboard, engagement] = await Promise.all([
    loadStudentDashboard(student.id, now),
    getStudentEngagement(student.id, now),
  ]);
  const savedPlans = await loadSavedPlans(student.id, dashboard.goalClasses);

  const summary =
    dashboard.classes.length === 0 ? "Your classes and assignments will show up here." : inboxSummary(dashboard.inbox);

  return (
    <StudentHomeView
      firstName={firstName(student.name)}
      summary={summary}
      engagement={engagement}
      cards={buildClassCards(dashboard.classes, dashboard.inbox, now)}
      inbox={dashboard.inbox}
      plannerClasses={dashboard.classes.map(({ id, name, section }) => ({ id, name, section }))}
      savedPlans={savedPlans}
      engine={goalEngineInfo()}
    />
  );
}
