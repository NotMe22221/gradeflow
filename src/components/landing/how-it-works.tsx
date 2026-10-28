import { Blob, DotGrid, XGrid } from "@/components/decor/decor";
import { BAND_BG, BOLD_SECTION_Y, NumberSticker, type BandTone } from "@/components/landing/bold-section";
import { ScreenshotFrame } from "@/components/landing/screenshot";
import type { ScreenshotId } from "@/components/landing/screenshots";
import { LandingContainer, SectionIntro } from "@/components/landing/section-intro";
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
  /** The color of the step's number and of the panel behind its screenshot. */
  tone: BandTone;
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
    tone: "coral",
  },
  {
    title: "Review the first pass",
    body: "Run the first pass on every paper at once. Each criterion gets a suggested score, a short reason and the quote it rests on, so you check the paper instead of starting from zero. Change any score or comment.",
    details: [
      "Drafts most worth a second look come first, like a missing quote or a score you often change",
      "Text in a paper aimed at the grader is flagged for you to check",
      "J and K move between papers, A approves, S sends back",
    ],
    shot: "firstPass",
    caption: "Suggested scores, each with the quote behind it.",
    tone: "mint",
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
    tone: "yellow",
  },
];

/** Paint at the panel's edges, behind the screenshot: never over it. */
function PanelDecor({ index }: { index: number }) {
  if (index === 0) {
    return (
      <>
        <Blob shape={4} tone="yellow" className="-bottom-20 -left-16 w-56 sm:-bottom-24 sm:w-72" />
        <XGrid cols={4} rows={3} className="top-6 right-6 hidden w-28 stroke-pop-ink-on sm:block" />
      </>
    );
  }
  if (index === 1) return <DotGrid cols={7} rows={5} className="-right-2 -bottom-2 w-36 fill-pop-ink-on sm:w-44" />;
  return <Blob shape={6} tone="pink" className="-top-16 -right-14 w-48 sm:-top-20 sm:-right-16 sm:w-64" />;
}

export function HowItWorks({ theme }: { theme: Theme }) {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className={cn("relative isolate overflow-x-clip", BOLD_SECTION_Y)}
    >
      <LandingContainer>
        <SectionIntro
          id="how-it-works-heading"
          title="How it works"
          description="Three steps, from a stack of papers to grades back in students' hands. The slow first read is drafted for you. Every decision stays yours."
        />
        <ol className="mt-14 space-y-20 sm:mt-20 sm:space-y-28">
          {STEPS.map((step, index) => (
            <li key={step.title} className="grid items-center gap-8 lg:grid-cols-12 lg:gap-14">
              <div className={cn("lg:col-span-5", index % 2 === 1 && "lg:order-2")}>
                <p className="flex items-center gap-4 text-[0.9375rem] font-semibold text-muted-foreground">
                  <NumberSticker
                    value={index + 1}
                    tone={step.tone}
                    shape={index}
                    className="size-16 text-[2.25rem] sm:size-20 sm:text-[2.75rem]"
                  />
                  Step {index + 1} of {STEPS.length}
                </p>
                <h3 className="display-title mt-5 text-foreground">{step.title}</h3>
                <p className="mt-4 max-w-[60ch] text-base leading-7 text-pretty text-muted-foreground sm:text-[1.0625rem] sm:leading-8">
                  {step.body}
                </p>
                <ul className="mt-7 space-y-3 border-t-2 border-foreground pt-6">
                  {step.details.map((detail) => (
                    <li key={detail} className="flex gap-3 text-[0.9375rem] leading-6 font-medium text-foreground">
                      <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
              <figure className={cn("min-w-0 lg:col-span-7", index % 2 === 1 && "lg:order-1")}>
                <div
                  className={cn(
                    "relative isolate flex justify-center overflow-hidden rounded-[2rem] p-5 sm:rounded-[2.5rem] sm:p-10",
                    BAND_BG[step.tone]
                  )}
                >
                  <PanelDecor index={index} />
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
