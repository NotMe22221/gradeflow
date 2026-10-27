import { BookOpen } from "@/components/icons";
import { GreetingDecor } from "@/components/decor/student";
import { EmptyState } from "@/components/empty-state";
import { ArrangeableClassGrid } from "@/components/layout-editor/arrangeable-class-grid";
import { CustomizableSections, type SectionSpec } from "@/components/layout-editor/customizable-sections";
import { ArrangeButton, FixedRegion, LayoutEditorProvider } from "@/components/layout-editor/editor-context";
import { MAIN_ONLY_SECTIONS } from "@/components/layout-editor/model";
import { PageContainer, TitlePeriod } from "@/components/page-header";
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
 * The student Home: a greeting band on top, then the sections in the student's
 * saved arrangement (streak and XP, class cards, the assignment inbox, the
 * goal planner). Arrange, or ?customize=1, rearranges them. Data is loaded
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
              className="rounded-3xl"
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
          {/* The greeting band: big type on yellow, paint at the right edge (GreetingDecor). Arrange sits
              beside the date, so the greeting keeps the full width; from 34rem the text stops at 55% of
              the band, clear of the art. In the Calm look the band turns plain and the art goes. */}
          <header className="@container relative isolate grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 overflow-hidden rounded-[2rem] bg-band-yellow px-5 pt-5 pb-7 text-band-foreground sm:px-8 sm:pt-7 sm:pb-9 lg:px-10 lg:pb-11">
            <GreetingDecor />
            <p className="min-h-5 text-[0.875rem] font-semibold">{today}</p>
            {hasClasses ? <ArrangeButton className="col-start-2 row-start-1" /> : null}
            <h1 className="display-section col-span-2 mt-4 max-w-[12em] @min-[34rem]:max-w-[55%]">
              Welcome back, {firstName}
              <TitlePeriod onBand />
            </h1>
            <p className="col-span-2 mt-3 max-w-[48ch] text-[1rem] leading-7 font-medium text-pretty @min-[34rem]:max-w-[55%] sm:text-[1.0625rem]">
              {summary}
            </p>
          </header>
        </FixedRegion>

        {/* Lets the inbox's "Plan my grade" hand a class to the planner, wherever each one sits
            (and only while the planner's section is shown). */}
        <PlannerBridgeProvider section="planner">
          <CustomizableSections className="mt-8" sections={sections} />
        </PlannerBridgeProvider>
      </LayoutEditorProvider>
    </PageContainer>
  );
}
