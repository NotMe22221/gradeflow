import { ScreenshotFrame } from "@/components/landing/screenshot";
import type { ScreenshotId } from "@/components/landing/screenshots";
import { LandingContainer, SECTION_SPACING, SectionIntro } from "@/components/landing/section-intro";
import type { Theme } from "@/lib/preferences/schema";
import { cn } from "@/lib/utils";

type Step = {
  title: string;
  body: string;
  details: string[];
  shot: ScreenshotId;
  /** Phone screenshots get the phone frame. */
  phone?: boolean;
  caption: string;
};

const STEPS: Step[] = [
  {
    title: "Collect the work",
    body: "Students turn in typed work from their To-do: paste it or upload a .txt file. For a paper test, photograph each page with your phone or upload the scans, then pick the student.",
    details: [
      "Up to 4 photos per test, in page order",
      "Snap your answer key and each question becomes a line on the rubric",
      "Or add a paper for a student yourself",
    ],
    shot: "collect",
    phone: true,
    caption: "The Paper Scanner on a phone, with a sample quiz photo added.",
  },
  {
    title: "Review the first pass",
    body: "Run the first pass on every paper at once. Each criterion gets a suggested score, a short reason and the quote it rests on, so you check the paper instead of starting from zero. Change any score or comment.",
    details: [
      "Papers the grader is least sure of come first",
      "Text in a paper aimed at the grader is flagged for you to check",
      "J and K move between papers, A approves, S sends back",
    ],
    shot: "firstPass",
    caption: "Suggested scores, each with the quote behind it.",
  },
  {
    title: "Return feedback",
    body: "When a grade looks right, choose Approve & return. The student sees the score, feedback on each question and your comment. Or send the paper back with a note asking for a revision.",
    details: [
      "Approved grades go to the gradebook",
      "Export a class to CSV for your school's system",
      "Students only ever see grades you approved",
    ],
    shot: "returned",
    caption: "What the student sees once you approve.",
  },
];

export function HowItWorks({ theme }: { theme: Theme }) {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className={SECTION_SPACING}>
      <LandingContainer>
        <SectionIntro
          id="how-it-works-heading"
          title="How it works"
          description="Three steps, from a stack of papers to grades back in students' hands. The slow first read is drafted for you. Every decision stays yours."
        />
        <ol className="mt-12 space-y-16 sm:mt-16 sm:space-y-24">
          {STEPS.map((step, index) => (
            <li key={step.title} className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
              <div className={cn("lg:col-span-5", index % 2 === 1 && "lg:order-2")}>
                <p className="flex items-center gap-3 text-[0.875rem] font-medium text-muted-foreground">
                  <span
                    aria-hidden
                    className="tabular flex size-8 items-center justify-center rounded-full bg-primary-soft text-[0.9375rem] font-semibold text-primary-soft-foreground"
                  >
                    {index + 1}
                  </span>
                  Step {index + 1} of {STEPS.length}
                </p>
                <h3 className="mt-4 text-[1.375rem] leading-snug font-medium text-foreground sm:text-[1.5rem]">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[60ch] text-base leading-7 text-pretty text-muted-foreground">{step.body}</p>
                <ul className="mt-6 space-y-3 border-t border-border pt-6">
                  {step.details.map((detail) => (
                    <li key={detail} className="flex gap-3 text-[0.9375rem] leading-6 text-foreground">
                      <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
              <figure className={cn("min-w-0 lg:col-span-7", index % 2 === 1 && "lg:order-1")}>
                <div className="flex justify-center rounded-2xl bg-secondary p-4 sm:p-8">
                  <ScreenshotFrame
                    id={step.shot}
                    theme={theme}
                    shape={step.phone ? "phone" : "window"}
                    className={step.phone ? "max-w-[20rem] sm:max-w-[20rem]" : undefined}
                  />
                </div>
                <figcaption className="mt-3 text-[0.875rem] text-muted-foreground">{step.caption}</figcaption>
              </figure>
            </li>
          ))}
        </ol>
      </LandingContainer>
    </section>
  );
}
