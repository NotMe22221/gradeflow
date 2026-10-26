import { BookOpen } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/page-header";
import { AssignmentInbox } from "@/components/student/assignment-inbox";
import { StudentClassCard, StudentClassCardGrid, type StudentClassCardData } from "@/components/student/class-card";
import { GoalPlanner } from "@/components/student/goal-planner";
import type { InboxRow } from "@/components/student/inbox-model";
import { PlannerBridgeProvider } from "@/components/student/planner-bridge";
import { StudyHeader } from "@/components/student/study-header";
import type { StudentEngagement } from "@/lib/gamification/engagement";
import type { GoalEngine, GoalPlanView } from "@/lib/goals/types";

/**
 * The student Home, in Google Classroom's layout: the XP and streak strip,
 * the class cards, then the assignment inbox and the goal planner. Data is
 * loaded by the page, for the signed-in student only.
 */
export function StudentHomeView({
  firstName,
  summary,
  engagement,
  cards,
  inbox,
  plannerClasses,
  savedPlans,
  engine,
}: {
  firstName: string;
  summary: string;
  engagement: Pick<StudentEngagement, "streak" | "level" | "recent" | "studyLoggedToday">;
  cards: StudentClassCardData[];
  inbox: InboxRow[];
  plannerClasses: { id: string; name: string; section: string | null }[];
  savedPlans: GoalPlanView[];
  engine: { engine: GoalEngine; model: string | null };
}) {
  return (
    <PageContainer className="space-y-8">
      <StudyHeader
        firstName={firstName}
        summary={summary}
        streak={engagement.streak}
        level={engagement.level}
        recent={engagement.recent}
      />

      {cards.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="You're not enrolled in any classes yet."
          description="When your teacher adds you to a class, it shows up here with its assignments."
          className="rounded-xl"
        />
      ) : (
        <>
          <section aria-labelledby="classes-heading">
            <h2 id="classes-heading" className="sr-only">
              Your classes
            </h2>
            <StudentClassCardGrid>
              {cards.map((card) => (
                <li key={card.id} className="min-w-0">
                  <StudentClassCard data={card} />
                </li>
              ))}
            </StudentClassCardGrid>
          </section>

          <PlannerBridgeProvider>
            <AssignmentInbox rows={inbox} studyLoggedToday={engagement.studyLoggedToday} />
            <GoalPlanner
              classes={plannerClasses}
              savedPlans={savedPlans}
              defaultClassId={savedPlans[0]?.classId ?? plannerClasses[0]?.id ?? null}
              engine={engine}
            />
          </PlannerBridgeProvider>
        </>
      )}
    </PageContainer>
  );
}
