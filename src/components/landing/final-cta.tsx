import { ArrowRight } from "lucide-react";

import { DemoCtas } from "@/components/landing/demo-ctas";
import { LandingContainer } from "@/components/landing/section-intro";

export function FinalCta({ demoLogin }: { demoLogin: boolean }) {
  return (
    <section aria-labelledby="final-cta-heading" className="py-20 sm:py-28">
      <LandingContainer>
        <div className="rounded-2xl border border-border bg-secondary/60 px-6 py-12 text-center sm:px-12 sm:py-16">
          <h2
            id="final-cta-heading"
            className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl sm:leading-[1.15]"
          >
            Grade one paper the GradeSmart AI way.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-pretty text-muted-foreground">
            Open the demo class, run the AI first pass or scan a sample handwritten test, edit a suggestion,
            and approve it. Then watch the grade land in the gradebook and the student view.
          </p>
          <DemoCtas
            demoLogin={demoLogin}
            className="mt-8"
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
