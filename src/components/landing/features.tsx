import {
  Backpack,
  Camera,
  FileUser,
  Flame,
  FlaskConical,
  GraduationCap,
  Grid3x3,
  Inbox,
  ListChecks,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";

import {
  BriefPreview,
  CameraPreview,
  GoalPreview,
  HeatmapPreview,
  InboxPreview,
  QueuePreview,
  StreakPreview,
} from "@/components/landing/feature-previews";
import { LandingContainer, SectionIntro } from "@/components/landing/section-intro";
import { cn } from "@/lib/utils";

type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
  /** The AI engine behind the feature when its API key is set. Omitted for features with no AI. */
  engine?: string;
  preview: React.ReactNode;
};

const TEACHER_FEATURES: Feature[] = [
  {
    icon: Camera,
    title: "Grade handwritten tests from a photo",
    body: "Snap or upload each page. GPT-4o reads the handwriting and scores every question against your answer key. Then the test waits in your review queue for your approval.",
    engine: "GPT-4o vision",
    preview: <CameraPreview />,
  },
  {
    icon: FileUser,
    title: "Conference briefs in one click",
    body: "A one-page summary of a student's strengths, growth areas, and talking points, written only from grades you approved. Read it over before you share it.",
    engine: "GPT-4o mini",
    preview: <BriefPreview />,
  },
  {
    icon: Grid3x3,
    title: "See what the class is missing",
    body: "A heatmap of every question and criterion shows where the class loses points, so you know what to reteach next. It counts only grades you approved.",
    preview: <HeatmapPreview />,
  },
  {
    icon: ListChecks,
    title: "One review queue, one gradebook",
    body: "Typed papers and camera-graded tests wait side by side with their evidence and confidence. Approved grades land in the gradebook, ready for CSV export.",
    engine: "Claude for essays",
    preview: <QueuePreview />,
  },
];

const STUDENT_FEATURES: Feature[] = [
  {
    icon: Target,
    title: "Plan the grade you want",
    body: "Type a goal like “I need an A.” The planner works out the exact score needed on each remaining assignment. AI reads the goal; the math is done in code.",
    engine: "GPT-4o mini",
    preview: <GoalPreview />,
  },
  {
    icon: Flame,
    title: "Streaks and XP",
    body: "Earn XP for submitting work, logging study sessions, and setting goals. XP rewards effort and never touches a grade.",
    preview: <StreakPreview />,
  },
  {
    icon: Inbox,
    title: "One inbox for every assignment",
    body: "Every assignment from every class in one list, with quick actions beside it to submit, read feedback, or plan the grade.",
    preview: <InboxPreview />,
  },
];

export function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="scroll-mt-16 py-20 sm:py-28"
    >
      <LandingContainer>
        <SectionIntro
          id="features-heading"
          eyebrow="Features"
          title="Built for paper classrooms, from both sides of the desk."
          description="GradeSmart AI connects the paper in your classroom to grades online. Teachers get through the stack faster, and students always know where they stand."
        />

        <FeatureGroup
          id="features-teachers"
          icon={GraduationCap}
          label="For teachers"
          features={TEACHER_FEATURES}
          gridClassName="md:grid-cols-2"
        />
        <FeatureGroup
          id="features-students"
          icon={Backpack}
          label="For students"
          features={STUDENT_FEATURES}
          gridClassName="lg:grid-cols-3"
        />

        <p className="mt-10 flex items-start gap-2.5 rounded-xl bg-secondary px-4 py-3 text-sm text-pretty text-secondary-foreground">
          <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Uses Claude for essays and OpenAI GPT-4o for handwriting when API keys are set; without keys,
            labelled demo engines run locally.
          </span>
        </p>
      </LandingContainer>
    </section>
  );
}

/** A group heading in the style of Classroom's People tab: primary-colored title over a primary rule. */
function FeatureGroup({
  id,
  icon: Icon,
  label,
  features,
  gridClassName,
}: {
  id: string;
  icon: LucideIcon;
  label: string;
  features: Feature[];
  gridClassName: string;
}) {
  return (
    <div className="mt-14 sm:mt-16">
      <div className="flex items-center gap-3 border-b border-primary pb-2.5">
        <Icon className="size-6 shrink-0 text-primary" aria-hidden />
        <h3 id={id} className="text-[24px] leading-8 font-normal text-primary sm:text-[28px] sm:leading-9">
          {label}
        </h3>
      </div>
      <ul aria-labelledby={id} className={cn("mt-6 grid gap-6", gridClassName)}>
        {features.map((feature) => (
          <FeatureCard key={feature.title} feature={feature} />
        ))}
      </ul>
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
            <feature.icon className="size-5" aria-hidden />
          </span>
          {feature.engine ? (
            <span className="inline-flex h-7 min-w-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 shrink-0" aria-hidden />
              <span className="sr-only">AI engine: </span>
              <span className="truncate">{feature.engine}</span>
            </span>
          ) : null}
        </div>
        <h4 className="mt-5 font-display text-lg leading-snug font-medium text-balance text-foreground">
          {feature.title}
        </h4>
        <p className="mt-2 text-sm leading-6 text-pretty text-muted-foreground">{feature.body}</p>
      </div>
      {/* Decorative product preview; the text above describes the feature. */}
      <div
        aria-hidden
        className="pointer-events-none flex grow items-center border-t border-border bg-background px-4 py-6 select-none"
      >
        <div className="@container mx-auto w-full max-w-md">{feature.preview}</div>
      </div>
    </li>
  );
}
