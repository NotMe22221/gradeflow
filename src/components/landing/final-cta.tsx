import { ArrowRight } from "@/components/icons";

import { DemoCtas } from "@/components/landing/demo-ctas";
import { LandingContainer } from "@/components/landing/section-intro";

export function FinalCta({ demoLogin }: { demoLogin: boolean }) {
  return (
    <section aria-labelledby="final-cta-heading" className="py-20 sm:py-28">
      <LandingContainer>
        <div className="rounded-[28px] bg-primary-soft px-6 py-12 text-center text-primary-soft-foreground sm:px-12 sm:py-16">
          <h2
            id="final-cta-heading"
            className="mx-auto max-w-2xl text-[1.875rem] leading-[1.2] font-medium tracking-[-0.01em] text-balance sm:text-[2.5rem] sm:leading-[1.15]"
          >
            Grade one paper the GradeSmart AI way.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-pretty opacity-85">
            Open the demo class, run the AI first pass or scan a sample handwritten test, edit a suggestion,
            and approve it. Then watch the grade land in the gradebook and the student view.
          </p>
          <DemoCtas
            demoLogin={demoLogin}
            className="mt-8 [&>p]:text-primary-soft-foreground/80"
            primaryLabel={
              <>
                View the demo
                <ArrowRight aria-hidden />
              </>
            }
          />
        </div>
      </LandingContainer>
    </section>
  );
}
