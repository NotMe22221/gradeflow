import { LogoMark } from "@/components/brand/logo";
import { LandingContainer } from "@/components/landing/section-intro";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <LandingContainer className="flex flex-col gap-3 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2.5">
          <LogoMark className="size-6" />
          <span>
            <span className="font-medium text-foreground">GradeSmart AI</span>
            <span aria-hidden> · </span>
            <span className="sr-only">, </span>
            Hackathon demo
            <span aria-hidden> · </span>
            <span className="sr-only">, </span>
            Synthetic data only
          </span>
        </p>
        <p>Works alongside your LMS via CSV export.</p>
      </LandingContainer>
    </footer>
  );
}
