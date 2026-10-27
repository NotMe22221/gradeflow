import { ArrowDown, CircleCheck } from "@/components/icons";

import { Blob, DotGrid, Squiggle, XGrid } from "@/components/decor/decor";
import { Period } from "@/components/decor/period";
import { DemoCtas } from "@/components/landing/demo-ctas";
import { ScreenshotFrame } from "@/components/landing/screenshot";
import type { Theme } from "@/lib/preferences/schema";
import { cn } from "@/lib/utils";

/**
 * The outcome first, then how it works and who stays in control, then the
 * product itself: a real screenshot of To review, the screen teachers use most.
 *
 * The Bold look frames it like a poster: paint blobs bleed off the top right
 * and frame the screenshot, sized in vw so they keep clear of the headline at
 * every width (the headline is sized in vw too). The text never sits on decor.
 */
export function Hero({ demoLogin, theme }: { demoLogin: boolean; theme: Theme }) {
  return (
    <section aria-labelledby="hero-heading" className="relative isolate overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
      {/* Top right: a big yellow blob (the one that drifts), a coral one over its edge, X marks on it. On
          phones only the yellow corner shows, above the headline.
          overflow-visible: the blob's outline reaches a little past its 200 x 200 box, and a clipped
          box would cut a straight edge into it. */}
      <Blob
        shape={4}
        tone="yellow"
        float
        className="-top-[22vw] -right-[10vw] w-[38vw] overflow-visible sm:-top-[20vw] lg:-top-[13vw] lg:-right-[9vw] lg:w-[40vw]"
      />
      <Blob shape={2} tone="coral" className="hidden lg:block lg:-top-[5vw] lg:right-[20vw] lg:w-[17vw]" />
      <XGrid cols={6} rows={4} className="hidden md:block md:top-[4.5vw] md:right-[5vw] md:w-[12vw]" />

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-x-8 lg:px-8">
        <div className="lg:col-span-12">
          <p className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[0.9375rem] font-semibold text-foreground">
            <span aria-hidden className="size-2 rounded-full bg-primary" />
            For teachers who grade with a rubric
          </p>
          <h1 id="hero-heading" className="display-hero relative mt-6 max-w-[9em] text-foreground">
            <span className="block">Get through the stack faster.</span>
            <span className="block">
              Keep the final say
              <Period />
            </span>
            {/* Trails the second line ("stack faster."), placed in em so it follows the headline's size. */}
            <Squiggle tone="pink" className="top-[1.33em] left-[5.75em] hidden w-[1.35em] lg:block" />
          </h1>
        </div>
        <div className="lg:col-span-7">
          <p className="mt-8 max-w-[56ch] text-[1.0625rem] leading-8 text-pretty text-muted-foreground sm:text-[1.1875rem] sm:leading-9">
            <span className="font-semibold text-foreground">AI drafts the first pass. You make the call.</span>{" "}
            Markwise reads typed essays and photos of handwritten tests against your rubric. For each criterion it
            suggests a score and quotes the line from the paper behind it. Nothing reaches a student until you approve
            it.
          </p>
          <DemoCtas demoLogin={demoLogin} className="mt-9" />
          {/* The header's section links fold away on phones and tablets, so judges get a way in here too. */}
          <p className="mt-3 text-[0.9375rem] leading-7 text-pretty">
            <a
              href="#judges"
              className="rounded-sm py-1 font-medium text-primary underline underline-offset-4 outline-none hover:decoration-2 focus-visible:ring-2 focus-visible:ring-ring"
            >
              Judging this project? See how Markwise compares
              <ArrowDown aria-hidden className="ml-1 inline size-[1.05em] align-[-0.175em]" />
            </a>
          </p>
        </div>
        {/* From xl, a sample of the first pass with paint behind its lower right, where it can't reach the
            lede. Below xl the column is too narrow to keep the card clear of the lede, so only the paint
            shows, bleeding off the right edge. */}
        <div className="relative isolate mt-10 hidden lg:col-span-5 lg:block xl:self-start xl:justify-self-end">
          <Blob
            shape={3}
            tone="sky"
            className="lg:top-6 lg:-right-36 lg:w-80 xl:top-auto xl:-right-20 xl:-bottom-24"
          />
          <DotGrid cols={8} rows={5} className="w-40 lg:right-16 lg:-bottom-6 xl:-right-10 xl:-bottom-12" />
          <SampleScore className="hidden xl:block" />
        </div>
      </div>

      <figure className="relative isolate mx-auto mt-14 w-full max-w-7xl px-4 sm:mt-20 sm:px-6 lg:px-8">
        {/* Phones: coral peeks over the panel's top right, so the first screen carries more than one color.
            From lg it moves to the bottom left. */}
        <Blob shape={5} tone="coral" className="-top-14 -right-24 w-64 sm:hidden" />
        <Blob shape={5} tone="coral" className="hidden lg:block lg:-bottom-16 lg:-left-28 lg:w-72" />
        <div className="rounded-[1.75rem] bg-band-mint p-3 sm:rounded-[2.5rem] sm:p-8 lg:p-12">
          <ScreenshotFrame
            id="review"
            small="reviewPhone"
            theme={theme}
            priority
            className="mx-auto rounded-2xl shadow-raised"
          />
        </div>
        <figcaption className="mx-auto mt-5 max-w-[65ch] text-center text-[0.875rem] leading-6 text-pretty text-muted-foreground">
          To review in the demo. Highlights mark the quotes behind each suggested score; the score boxes are yours to
          change before you approve.
        </figcaption>
      </figure>
    </section>
  );
}

/**
 * A small frosted card of what a first pass looks like: a suggested score with
 * the quote from the paper behind it. One picture with a text alternative, so
 * a screen reader hears one sentence instead of a stray score.
 */
function SampleScore({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="An example from the demo: a suggested 9 out of 10 for Evidence and reasoning, with the quote from the paper behind it."
      className={cn("glass w-full max-w-sm rounded-3xl p-6", className)}
    >
      <p className="text-[0.8125rem] font-medium text-muted-foreground">Suggested score</p>
      <div className="mt-1 flex items-baseline justify-between gap-4">
        <p className="font-display text-[1.125rem] leading-snug font-bold text-foreground">Evidence and reasoning</p>
        <p className="tabular shrink-0 font-display text-[1.75rem] leading-none font-extrabold tracking-[-0.03em] text-foreground">
          9<span className="text-[1rem] font-semibold tracking-normal text-muted-foreground"> / 10</span>
        </p>
      </div>
      <p className="mt-3 text-[0.9375rem] leading-6 text-muted-foreground">
        &ldquo;According to the Cedar Ridge Student Sleep Survey,{" "}
        <span className="rounded-sm bg-highlight px-0.5 text-foreground">
          students average only 6.6 hours of sleep
        </span>{" "}
        on school nights.&rdquo;
      </p>
      <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-success-soft py-1 pr-3 pl-2 text-[0.8125rem] font-semibold text-success-soft-foreground">
        <CircleCheck aria-hidden className="size-4" />
        Quote found in the paper
      </p>
    </div>
  );
}
