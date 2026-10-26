import { ScreenshotFrame } from "@/components/landing/screenshot";
import type { ScreenshotId } from "@/components/landing/screenshots";
import { LandingContainer, SECTION_SPACING, SectionIntro } from "@/components/landing/section-intro";
import type { Theme } from "@/lib/preferences/schema";

const SCREENS: { shot: ScreenshotId; title: string; body: string }[] = [
  {
    shot: "studentTodo",
    title: "One list of what's due",
    body: "Assigned, Missing and Done, grouped by due date. Late work collects under Missing, so nothing slips by quietly.",
  },
  {
    shot: "studentHome",
    title: "A streak that doesn't nag",
    body: "Logging a study session keeps the streak going and earns XP. XP tracks effort and never changes a grade. Students can hide it.",
  },
  {
    shot: "studentGoal",
    title: "A plan for the grade they want",
    body: "Type “I need a B” and the planner shows the score needed on each assignment left, worked out from approved grades only.",
  },
];

/** The student side, shown at phone size because that's where students check it. */
export function StudentSide({ theme }: { theme: Theme }) {
  return (
    <section id="students" aria-labelledby="students-heading" className={SECTION_SPACING}>
      <LandingContainer>
        <SectionIntro
          id="students-heading"
          title="For students, a calm place to see what's due"
          description="Students see their work, the grades you approved and your feedback. Never a draft, a confidence label or another student's work."
        />
        <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {SCREENS.map((screen) => (
            <li key={screen.shot} className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-start gap-5 md:grid-cols-1 md:gap-6">
              <div className="order-2 flex justify-center rounded-2xl bg-secondary p-2 md:order-1 md:p-6">
                <ScreenshotFrame
                  id={screen.shot}
                  theme={theme}
                  shape="phone"
                  className="rounded-[0.875rem] md:rounded-[1.75rem]"
                />
              </div>
              <div className="order-1 md:order-2">
                <h3 className="text-[1.125rem] leading-snug font-medium text-foreground">{screen.title}</h3>
                <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-6 text-pretty text-muted-foreground">
                  {screen.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </LandingContainer>
    </section>
  );
}
