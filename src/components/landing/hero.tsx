import { ArrowRight } from "lucide-react";

import { DemoCtas } from "@/components/landing/demo-ctas";
import { HeroMock } from "@/components/landing/hero-mock";
import { LandingContainer } from "@/components/landing/section-intro";

const PITCH =
  "GradeSmart AI takes student papers from submission to published grades: AI suggests rubric scores with quoted evidence, and nothing publishes until you approve it.";

export function Hero({ demoLogin }: { demoLogin: boolean }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="overflow-x-clip pt-12 pb-20 sm:pt-20 sm:pb-28 lg:pt-24"
    >
      <LandingContainer>
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[13px] font-medium text-muted-foreground shadow-card">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            AI-assisted grading for teachers
          </p>
          <h1
            id="hero-heading"
            className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance text-foreground sm:text-6xl sm:leading-[1.04]"
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
        <HeroMock className="mt-16 sm:mt-20" />
      </LandingContainer>
    </section>
  );
}
