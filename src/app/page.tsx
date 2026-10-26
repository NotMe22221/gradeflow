import { unstable_rethrow } from "next/navigation";

import { Accessibility } from "@/components/landing/accessibility";
import { ApprovalGate } from "@/components/landing/approval-gate";
import { DeliberatelySmall } from "@/components/landing/deliberately-small";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SetupCallout } from "@/components/landing/setup-callout";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { StudentSide } from "@/components/landing/student-side";
import { getCurrentUser } from "@/lib/auth/session";
import { demoLoginEnabled } from "@/lib/constants";
import type { Theme } from "@/lib/preferences/schema";
import { getViewerPreferences } from "@/lib/preferences/server";

type LandingSearchParams = Promise<Record<string, string | string[] | undefined>>;

/** The page must render even before the database is set up: data errors fall back to signed out. */
async function viewer() {
  try {
    const [user, preferences] = await Promise.all([getCurrentUser(), getViewerPreferences()]);
    return { user, theme: preferences.theme };
  } catch (error) {
    // Let Next see dynamic-rendering signals (reading cookies); only data errors fall back.
    unstable_rethrow(error);
    return { user: null, theme: "system" as Theme };
  }
}

export default async function LandingPage({ searchParams }: { searchParams: LandingSearchParams }) {
  const [params, { user, theme }] = await Promise.all([searchParams, viewer()]);

  const needsSeed = params.setup === "seed";
  const appHref = user ? (user.role === "TEACHER" ? "/dashboard" : "/student") : null;
  const demoLogin = demoLoginEnabled();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader appHref={appHref} demoLogin={demoLogin} />
      <main id="main" className="flex-1">
        {needsSeed ? <SetupCallout /> : null}
        <Hero demoLogin={demoLogin} theme={theme} />
        <HowItWorks theme={theme} />
        <Features />
        <DeliberatelySmall />
        <StudentSide theme={theme} />
        <ApprovalGate />
        <Accessibility theme={theme} />
        <Faq />
        <FinalCta demoLogin={demoLogin} />
      </main>
      <SiteFooter />
    </div>
  );
}
