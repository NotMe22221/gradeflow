import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { Blob, DotGrid, Squiggle, XGrid } from "@/components/decor/decor";
import { Period } from "@/components/decor/period";
import { ArrowDown } from "@/components/icons";
import { LandingContainer } from "@/components/landing/section-intro";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { TryWorkbench, type TrySample, type TryTemplate } from "@/components/try/try-workbench";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { demoLoginEnabled } from "@/lib/constants";
import { SAMPLE_PAPERS, type SamplePaperQuality } from "@/lib/demo/sample-papers";
import { RUBRIC_TEMPLATES, type TemplateId } from "@/lib/demo/templates";
import { sandboxAllowance } from "@/lib/try/grade";
import { latestRun, readSandboxToken } from "@/lib/try/sandbox";
import { TRY_MAX_CHARS, TRY_TTL_HOURS } from "@/lib/try/types";

export const metadata: Metadata = {
  title: "Try it",
  description: "Paste a short paper and see Markwise's first pass, with every quote checked against the paper.",
};

const SAMPLE_LABELS: Record<SamplePaperQuality, string> = {
  strong: "Strong",
  average: "Average",
  weak: "Weak",
  injection: "Asks for full marks",
};

const TEMPLATES: TryTemplate[] = RUBRIC_TEMPLATES.map((template) => ({
  id: template.id,
  name: template.name,
  title: template.title,
  criteria: template.criteria.length,
  points: template.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0),
}));

const SAMPLES = Object.fromEntries(
  RUBRIC_TEMPLATES.map((template) => [
    template.id,
    SAMPLE_PAPERS[template.id].map((sample) => ({ label: SAMPLE_LABELS[sample.quality], content: sample.content })),
  ])
) as Record<TemplateId, TrySample[]>;

async function signedInHref(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    return user ? (user.role === "TEACHER" ? "/dashboard" : "/student") : null;
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

/**
 * Try it: a sandbox for judges and visitors. Paste a paper, pick a built-in
 * rubric, and see the first pass with highlighted quotes. Each browser has
 * its own sandbox that expires, and it never touches the demo classes.
 */
export default async function TryPage() {
  const token = await readSandboxToken();
  const [appHref, initialResult, allowance] = await Promise.all([
    signedInHref(),
    token ? latestRun(token) : Promise.resolve(null),
    sandboxAllowance(token),
  ]);

  return (
    // overflow-x-clip: a last guard against sideways scrolling from decor; unlike hidden, it keeps the header sticky.
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-background">
      <SiteHeader appHref={appHref} demoLogin={demoLoginEnabled()} sectionBase="/" />
      <main id="main" className="flex-1">
        {/* The Bold look frames the hero like a poster: paint bleeds off the top right, marks and a second
            blob sit beside the text, never under it. On phones only the yellow corner shows. The lower blob is
            lilac and bleeds off the right edge, lifted clear of the mint sandbox band below, so it never reads
            as part of the band. */}
        <div className="relative isolate overflow-hidden pt-12 pb-14 sm:pt-20 sm:pb-20">
          <Blob
            shape={4}
            tone="yellow"
            float
            className="-top-[24vw] -right-[14vw] w-[40vw] sm:-top-[19vw] sm:w-[34vw] lg:-top-[12vw] lg:-right-[8vw] lg:w-[36vw]"
          />
          <Blob shape={1} tone="coral" className="hidden lg:block lg:top-[15vw] lg:right-[20vw] lg:w-[12vw]" />
          <XGrid cols={6} rows={4} className="hidden md:block md:top-[3vw] md:right-[4vw] md:w-[11vw]" />
          <Blob shape={6} tone="lilac" className="hidden lg:block lg:-right-[8vw] lg:bottom-[3vw] lg:w-[19vw]" />
          <DotGrid cols={8} rows={5} className="hidden lg:block lg:right-[29vw] lg:bottom-[3.5vw] lg:w-[10vw]" />

          <LandingContainer>
            <p className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[0.9375rem] font-semibold text-foreground">
              <span aria-hidden className="size-2 rounded-full bg-primary" />
              Try it
            </p>
            <h1 className="display-hero relative mt-6 max-w-[9em] text-foreground">
              Grade a paper of your own
              <Period />
              {/* Trails the headline's last line, placed in em so it follows the headline's size. */}
              <Squiggle tone="pink" waves={2} className="top-[1.3em] left-[6.6em] hidden w-[1.1em] xl:block" />
            </h1>
            <p className="mt-8 max-w-[60ch] text-[1.0625rem] leading-8 text-pretty text-muted-foreground sm:text-[1.1875rem] sm:leading-9">
              Paste a short paper and pick a rubric. You get the first pass a teacher would review: a score per
              criterion, the quote it rests on (checked word for word against the paper), and any flags. Try the
              &ldquo;Asks for full marks&rdquo; sample to see a paper that talks to the grader.
            </p>
            <p className="mt-4 max-w-[60ch] text-[0.9375rem] leading-7 text-pretty text-muted-foreground">
              This sandbox is yours alone. It doesn&apos;t touch the demo classes. What you paste is kept for{" "}
              {TRY_TTL_HOURS} hours, then deleted. Paste made-up writing only, never real student work.
            </p>
            <div className="mt-9 flex flex-col gap-3 min-[30rem]:flex-row min-[30rem]:flex-wrap">
              <Button asChild size="lg" className="w-full min-[30rem]:w-auto">
                <a href="#sandbox">
                  Paste a paper
                  <ArrowDown aria-hidden />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full min-[30rem]:w-auto">
                <Link href="/evidence">See the evidence</Link>
              </Button>
            </div>
          </LandingContainer>
        </div>

        <LandingContainer className="pb-16 sm:pb-24">
          <TryWorkbench
            templates={TEMPLATES}
            samples={SAMPLES}
            maxChars={TRY_MAX_CHARS}
            initialResult={initialResult}
            initialAllowance={allowance}
          />
        </LandingContainer>
      </main>
      <SiteFooter sectionBase="/" />
    </div>
  );
}
