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

/**
 * The student side, shown at phone size because that's where students check
 * it. Each phone screen keeps a readable width (about 18rem, never a
 * thumbnail): under its text on phones, beside it on tablets, and three
 * across from lg, where the gaps and panel padding tighten so the screens
 * stay as large.
 */
export function StudentSide({ theme }: { theme: Theme }) {
  return (
    <section id="students" aria-labelledby="students-heading" className={SECTION_SPACING}>
      <LandingContainer>
        <SectionIntro
          id="students-heading"
          title="For students, a calm place to see what's due"
          description="Students see their work, the grades you approved and your feedback. Never a draft, a confidence label or another student's work."
        />
        <ul className="mt-12 grid gap-14 md:gap-12 lg:grid-cols-3 lg:gap-6 xl:gap-8">
          {SCREENS.map((screen) => (
            <li
              key={screen.shot}
              className="grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_20rem] md:gap-8 lg:grid-cols-1 lg:content-start lg:gap-6"
            >
              <div>
                <h3 className="text-[1.125rem] leading-snug font-medium text-foreground">{screen.title}</h3>
                <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-6 text-pretty text-muted-foreground">
                  {screen.body}
                </p>
              </div>
              <div className="flex justify-center rounded-2xl bg-secondary p-4 lg:order-first lg:p-3 xl:p-5">
                <ScreenshotFrame
                  id={screen.shot}
                  theme={theme}
                  shape="phone"
                  className="max-w-[18rem] sm:max-w-[18rem] lg:max-w-(--shot-width)"
                />
              </div>
            </li>
          ))}
        </ul>
      </LandingContainer>
    </section>
  );
}
