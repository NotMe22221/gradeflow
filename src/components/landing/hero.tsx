import { DemoCtas } from "@/components/landing/demo-ctas";
import { ScreenshotFrame } from "@/components/landing/screenshot";
import type { Theme } from "@/lib/preferences/schema";

/**
 * The outcome first, then how it works and who stays in control, then the
 * product itself: a real screenshot of To review, the screen teachers use most.
 */
export function Hero({ demoLogin, theme }: { demoLogin: boolean; theme: Theme }) {
  return (
    <section aria-labelledby="hero-heading" className="pt-12 pb-4 sm:pt-20 sm:pb-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-[0.9375rem] font-medium text-muted-foreground">For teachers who grade with a rubric</p>
        <h1
          id="hero-heading"
          className="mt-4 max-w-4xl text-[2.375rem] leading-[1.1] font-medium tracking-[-0.025em] text-balance text-foreground sm:text-[3.25rem] lg:text-[3.5rem]"
        >
          <span className="block">Get through the stack faster.</span>
          <span className="block">Keep the final say.</span>
        </h1>
        <p className="mt-6 max-w-[60ch] text-[1.0625rem] leading-8 text-pretty text-muted-foreground sm:text-[1.125rem]">
          <span className="font-medium text-foreground">AI drafts the first pass. You make the call.</span>{" "}
          Markwise reads typed essays and photos of handwritten tests against your rubric. For each criterion it
          suggests a score and quotes the line from the paper behind it. Nothing reaches a student until you approve it.
        </p>
        <DemoCtas demoLogin={demoLogin} className="mt-8" />
      </div>

      <figure className="mx-auto mt-12 w-full max-w-7xl px-4 sm:mt-16 sm:px-6 lg:px-8">
        <ScreenshotFrame id="review" small="reviewPhone" theme={theme} priority className="mx-auto" />
        <figcaption className="mx-auto mt-4 max-w-[65ch] text-center text-[0.875rem] leading-6 text-pretty text-muted-foreground">
          To review in the demo. Highlights mark the quotes behind each suggested score; the score boxes are yours to
          change before you approve.
        </figcaption>
      </figure>
    </section>
  );
}
