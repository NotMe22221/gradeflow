import { DemoCtas } from "@/components/landing/demo-ctas";
import { LandingContainer } from "@/components/landing/section-intro";

export function FinalCta({ demoLogin }: { demoLogin: boolean }) {
  return (
    <section aria-labelledby="final-cta-heading" className="pb-16 sm:pb-24">
      <LandingContainer>
        <div className="rounded-[1.75rem] bg-secondary px-6 py-10 sm:px-10 sm:py-14">
          <div>
            <h2
              id="final-cta-heading"
              className="text-[1.75rem] leading-[1.2] font-medium tracking-[-0.015em] text-balance text-foreground sm:text-[2.25rem] sm:leading-[1.15]"
            >
              Try it on a sample class
            </h2>
            <p className="mt-4 max-w-[60ch] text-base leading-7 text-pretty text-muted-foreground sm:text-[1.0625rem] sm:leading-8">
              Sign in as Morgan Hale, a teacher with two sample classes and four essays waiting for a first pass. Run
              it, change a score you disagree with, and approve a paper. Then open the student view to see a returned
              grade the way a student does.
            </p>
          </div>
          <DemoCtas demoLogin={demoLogin} className="mt-8" note={null} />
        </div>
      </LandingContainer>
    </section>
  );
}
