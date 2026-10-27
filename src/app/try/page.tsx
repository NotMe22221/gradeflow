import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";

import { LandingContainer } from "@/components/landing/section-intro";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { TryWorkbench, type TrySample, type TryTemplate } from "@/components/try/try-workbench";
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
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader appHref={appHref} demoLogin={demoLoginEnabled()} sectionBase="/" />
      <main id="main" className="flex-1">
        <LandingContainer className="py-12 sm:py-16">
          <div className="max-w-3xl">
            <p className="text-[0.875rem] font-medium text-primary">Try it</p>
            <h1 className="mt-2 text-[2rem] leading-[1.15] font-medium tracking-[-0.02em] text-balance text-foreground sm:text-[2.75rem]">
              Grade a paper of your own
            </h1>
            <p className="mt-5 max-w-[65ch] text-base leading-7 text-pretty text-muted-foreground sm:text-[1.0625rem] sm:leading-8">
              Paste a short paper and pick a rubric. You get the first pass a teacher would review: a score per
              criterion, the quote it rests on (checked word for word against the paper), and any flags. Try the
              &ldquo;Asks for full marks&rdquo; sample to see a paper that talks to the grader.
            </p>
            <p className="mt-3 max-w-[65ch] text-[0.9375rem] leading-6 text-pretty text-muted-foreground">
              This sandbox is yours alone. It doesn&apos;t touch the demo classes. What you paste is kept for{" "}
              {TRY_TTL_HOURS} hours, then deleted. Paste made-up writing only, never real student work.
            </p>
          </div>

          <div className="mt-10">
            <TryWorkbench
              templates={TEMPLATES}
              samples={SAMPLES}
              maxChars={TRY_MAX_CHARS}
              initialResult={initialResult}
              initialAllowance={allowance}
            />
          </div>
        </LandingContainer>
      </main>
      <SiteFooter sectionBase="/" />
    </div>
  );
}
