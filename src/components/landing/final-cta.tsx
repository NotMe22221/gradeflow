import { Blob, Ring, XGrid } from "@/components/decor/decor";
import { Period } from "@/components/decor/period";
import { DemoCtas } from "@/components/landing/demo-ctas";
import { LandingContainer } from "@/components/landing/section-intro";

/**
 * The closing call to action: a full-width sunshine band with poster-sized
 * type. Text on the band is the band's own text color (a plain secondary panel
 * in the Calm look); the decor stays on the right, clear of the copy. Focus
 * rings take the band's text color, since the accent ring (light pink in dark
 * mode) is faint on yellow, and their offset gap takes the band's fill
 * (--background here only feeds ring-offset-background), so a dark ring never
 * runs into a dark glass button.
 */
export function FinalCta({ demoLogin }: { demoLogin: boolean }) {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="relative isolate overflow-hidden bg-band-yellow text-band-foreground [--background:var(--band-yellow)] [--ring:var(--band-foreground)]"
    >
      <Blob
        shape={1}
        tone="coral"
        className="-top-20 -right-20 w-44 sm:-top-28 sm:-right-24 sm:w-64 lg:-top-24 lg:-right-28 lg:w-[30rem]"
      />
      <XGrid cols={6} rows={4} className="hidden lg:block lg:top-20 lg:right-16 lg:w-44" />
      <Blob shape={6} tone="mint" className="hidden lg:block lg:right-[11rem] lg:-bottom-32 lg:w-72" />
      <Ring tone="pink" className="hidden xl:block xl:right-[24rem] xl:bottom-24 xl:w-16" />

      <LandingContainer className="py-20 sm:py-28 lg:py-32">
        {/* At lg the decor's rem sizes meet the heading's vw size: keep the copy left of the paint. */}
        <div className="max-w-3xl lg:max-w-[calc(100%-24rem)] xl:max-w-3xl">
          <h2 id="final-cta-heading" className="display-hero">
            Try it on a sample class
            <Period onBand />
          </h2>
          <p className="mt-6 max-w-[60ch] text-[1.0625rem] leading-8 text-pretty sm:text-[1.1875rem] sm:leading-9">
            Sign in as Morgan Hale, a teacher with two sample classes and essays waiting for a first pass. Run it,
            change a score you disagree with, and approve a paper. Then open the student view to see a returned grade
            the way a student does.
          </p>
        </div>
        <DemoCtas demoLogin={demoLogin} band className="mt-10 text-band-foreground" note={null} />
      </LandingContainer>
    </section>
  );
}
