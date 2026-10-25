import { ApprovalGate } from "@/components/landing/approval-gate";
import { DeliberatelySmall } from "@/components/landing/deliberately-small";
import { Features } from "@/components/landing/features";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SetupCallout } from "@/components/landing/setup-callout";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { getCurrentUser } from "@/lib/auth/session";
import { demoLoginEnabled } from "@/lib/constants";

type LandingSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LandingPage({ searchParams }: { searchParams: LandingSearchParams }) {
  const [params, user] = await Promise.all([
    searchParams,
    // The landing page must render even before the database is set up.
    getCurrentUser().catch(() => null),
  ]);

  const needsSeed = params.setup === "seed";
  const appHref = user ? (user.role === "TEACHER" ? "/dashboard" : "/student") : null;
  const demoLogin = demoLoginEnabled();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader appHref={appHref} demoLogin={demoLogin} />
      <main id="main" className="flex-1">
        {needsSeed ? <SetupCallout /> : null}
        <Hero demoLogin={demoLogin} />
        <Features />
        <HowItWorks />
        <ApprovalGate />
        <DeliberatelySmall />
        <FinalCta demoLogin={demoLogin} />
      </main>
      <SiteFooter />
    </div>
  );
}
