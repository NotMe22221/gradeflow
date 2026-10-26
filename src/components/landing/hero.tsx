import { ArrowRight, ShieldCheck } from "lucide-react";

import { DemoCtas } from "@/components/landing/demo-ctas";
import { HeroMock } from "@/components/landing/hero-mock";
import { LandingContainer } from "@/components/landing/section-intro";

const PITCH =
  "Grade typed papers and photographed handwritten tests side by side in To review. AI drafts rubric scores with quoted evidence, and nothing publishes until you approve it.";

export function Hero({ demoLogin }: { demoLogin: boolean }) {
  return (
    <section aria-labelledby="hero-heading" className="overflow-x-clip pt-12 pb-4 sm:pt-20 sm:pb-8 lg:pt-24">
      <LandingContainer>
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex h-8 items-center gap-2 rounded-full bg-primary-soft px-3.5 text-[13px] font-medium text-primary-soft-foreground">
            <ShieldCheck className="size-4" aria-hidden />
            AI-assisted grading for teachers
          </p>
          <h1
            id="hero-heading"
            className="mt-6 text-[40px] leading-[1.1] font-medium tracking-[-0.02em] text-balance text-foreground sm:text-[60px] sm:leading-[1.05]"
          >
            AI drafts the first pass. You make the call.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg sm:leading-8">
            {PITCH}
          </p>
          <DemoCtas
            demoLogin={demoLogin}
            className="mt-10"
            primaryLabel={
              <>
                View the demo
                <ArrowRight aria-hidden />
              </>
            }
          />
        </div>
        <HeroMock className="mt-14 sm:mt-20" />
      </LandingContainer>
    </section>
  );
}
