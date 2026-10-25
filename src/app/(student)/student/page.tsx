import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/page-header";
import { AssignmentInbox } from "@/components/student/assignment-inbox";
import { GoalPlanner } from "@/components/student/goal-planner";
import { PlannerBridgeProvider } from "@/components/student/planner-bridge";
import { StudyHeader } from "@/components/student/study-header";
import { requireStudentPage } from "@/lib/auth/session";
import { getStudentEngagement } from "@/lib/gamification/engagement";
import { goalEngineInfo } from "@/lib/goals/planner";
import { firstName, pluralize } from "@/lib/format";

import { loadSavedPlans, loadStudentDashboard } from "./data";

export const metadata: Metadata = { title: "Your dashboard" };

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

  const toSubmit = dashboard.inbox.filter((row) => row.state === "not_submitted" && row.kind !== "TEST").length;
  const toRevise = dashboard.inbox.filter((row) => row.state === "returned").length;
  const waiting = dashboard.inbox.filter((row) => row.state === "submitted").length;

  let summary: string;
  if (dashboard.classes.length === 0) {
    summary = "Your classes and assignments will show up here.";
  } else if (toSubmit > 0 || toRevise > 0) {
    const parts = [
      toSubmit > 0 ? `${pluralize(toSubmit, "assignment")} to submit` : null,
      toRevise > 0 ? `${pluralize(toRevise, "paper")} to revise` : null,
    ].filter(Boolean);
    summary = `You have ${parts.join(" and ")}.`;
  } else if (waiting > 0) {
    summary = "You're all caught up. Grades appear here once your teacher approves them.";
  } else {
    summary = "You're all caught up.";
  }

  return (
    <PageContainer className="space-y-6 lg:space-y-8">
      <StudyHeader
        firstName={firstName(student.name)}
        summary={summary}
        streak={engagement.streak}
        level={engagement.level}
        recent={engagement.recent}
      />

      {dashboard.classes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="You're not enrolled in any classes yet."
          description="When your teacher adds you to a class, its assignments will show up here."
        />
      ) : (
        <PlannerBridgeProvider>
          <AssignmentInbox rows={dashboard.inbox} studyLoggedToday={engagement.studyLoggedToday} />
          <GoalPlanner
            classes={dashboard.classes}
            savedPlans={savedPlans}
            defaultClassId={savedPlans[0]?.classId ?? dashboard.classes[0]?.id ?? null}
            engine={goalEngineInfo()}
          />
        </PlannerBridgeProvider>
      )}
    </PageContainer>
  );
}
