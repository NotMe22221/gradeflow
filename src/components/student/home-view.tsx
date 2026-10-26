import { BookOpen } from "@/components/icons";
import { EmptyState } from "@/components/empty-state";
import { ArrangeableClassGrid } from "@/components/layout-editor/arrangeable-class-grid";
import { CustomizableSections, type SectionSpec } from "@/components/layout-editor/customizable-sections";
import { CustomizeButton, FixedRegion, LayoutEditorProvider } from "@/components/layout-editor/editor-context";
import { MAIN_ONLY_SECTIONS } from "@/components/layout-editor/model";
import { PageContainer } from "@/components/page-header";
import { AssignmentInbox } from "@/components/student/assignment-inbox";
import { StudentClassCard, type StudentClassCardData } from "@/components/student/class-card";
import { GoalPlanner } from "@/components/student/goal-planner";
import type { InboxRow } from "@/components/student/inbox-model";
import { PlannerBridgeProvider } from "@/components/student/planner-bridge";
import { StudyProgress } from "@/components/student/study-header";
import type { StudentEngagement } from "@/lib/gamification/engagement";
import type { GoalEngine, GoalPlanView } from "@/lib/goals/types";
import { defaultSectionLayout, SURFACE_SECTIONS, type SectionLayout } from "@/lib/preferences/schema";

const SECTIONS = SURFACE_SECTIONS.studentHome;
const MAIN_ONLY = new Set(MAIN_ONLY_SECTIONS.studentHome);

/**
 * The student Home: a greeting on top, then the sections in the student's
 * saved arrangement (streak and XP, class cards, the assignment inbox, the
 * goal planner). Customize, or ?customize=1, rearranges them. Data is loaded
 * by the page, for the signed-in student only.
 */
export function StudentHomeView({
  firstName,
  today,
  summary,
  engagement,
  cards,
  inbox,
  plannerClasses,
  savedPlans,
  engine,
  layout,
  classOrder,
  startEditing = false,
}: {
  firstName: string;
  /** "Monday, October 26" in the viewer's zone. */
  today?: string;
  summary: string;
  engagement: Pick<StudentEngagement, "streak" | "level" | "recent" | "studyLoggedToday">;
  cards: StudentClassCardData[];
  inbox: InboxRow[];
  plannerClasses: { id: string; name: string; section: string | null }[];
  savedPlans: GoalPlanView[];
  engine: { engine: GoalEngine; model: string | null };
  layout: SectionLayout;
  classOrder: string[];
  startEditing?: boolean;
}) {
  const hasClasses = cards.length > 0;

  const sections: Record<string, SectionSpec> = {
    progress: {
      title: SECTIONS.progress.label,
      node: <StudyProgress streak={engagement.streak} level={engagement.level} recent={engagement.recent} />,
    },
    classes: {
      title: SECTIONS.classes.label,
      essential: SECTIONS.classes.essential,
      live: true,
      action: hasClasses ? { href: "/student/classes", label: "View all" } : undefined,
      node: (
        <ArrangeableClassGrid
          label="Your classes"
          items={cards.map((card) => ({ id: card.id, name: card.name, node: <StudentClassCard data={card} /> }))}
          empty={
            <EmptyState
              icon={BookOpen}
              title="You're not enrolled in any classes yet."
              description="When your teacher adds you to a class, it shows up here with its assignments."
              className="rounded-xl"
            />
          }
        />
      ),
    },
  };
  if (hasClasses) {
    sections.inbox = {
      title: SECTIONS.inbox.label,
      essential: SECTIONS.inbox.essential,
      ownHeading: true,
      mainOnly: MAIN_ONLY.has("inbox"),
      node: <AssignmentInbox rows={inbox} studyLoggedToday={engagement.studyLoggedToday} />,
    };
    sections.planner = {
      title: SECTIONS.planner.label,
      ownHeading: true,
      mainOnly: MAIN_ONLY.has("planner"),
      node: (
        <GoalPlanner
          classes={plannerClasses}
          savedPlans={savedPlans}
          defaultClassId={savedPlans[0]?.classId ?? plannerClasses[0]?.id ?? null}
          engine={engine}
        />
      ),
    };
  }

  return (
    <PageContainer>
      <LayoutEditorProvider
        surface="studentHome"
        layout={layout}
        defaultLayout={defaultSectionLayout("studentHome")}
        classOrder={classOrder}
        label="your Home"
        startEditing={startEditing && hasClasses}
      >
        <FixedRegion>
          {/* Phones: Customize sits beside the date, so the greeting keeps the full width. */}
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
            <p className="min-h-5 text-[0.8125rem] font-medium text-muted-foreground">{today}</p>
            {hasClasses ? <CustomizeButton className="col-start-2 row-start-1 sm:row-span-2 sm:self-end" /> : null}
            <h1 className="col-span-2 text-[1.625rem] leading-tight font-medium text-balance text-foreground sm:col-span-1 sm:text-[1.75rem]">
              Welcome back, {firstName}
            </h1>
            <p className="col-span-2 max-w-[65ch] text-[0.9375rem] text-pretty text-muted-foreground">{summary}</p>
          </header>
        </FixedRegion>

        {/* Lets the inbox's "Plan my grade" hand a class to the planner, wherever each one sits. */}
        <PlannerBridgeProvider>
          <CustomizableSections className="mt-8" sections={sections} />
        </PlannerBridgeProvider>
      </LayoutEditorProvider>
    </PageContainer>
  );
}
