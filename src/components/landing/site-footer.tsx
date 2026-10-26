import { LogoMark } from "@/components/brand/logo";
import { LandingContainer } from "@/components/landing/section-intro";
import { SECTION_LINKS } from "@/components/landing/site-header";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <LandingContainer className="grid gap-8 py-10 text-[0.875rem] leading-6 text-muted-foreground md:grid-cols-12">
        <div className="md:col-span-6">
          <p className="flex items-center gap-3">
            <LogoMark className="size-7" />
            <span className="font-display text-base">
              <span className="font-semibold text-foreground">GradeSmart</span> AI
            </span>
          </p>
          <p className="mt-4 max-w-[48ch] text-pretty">
            A hackathon demo. Every student, paper and grade in it is made up. Works alongside your LMS through CSV
            export.
          </p>
        </div>
        <nav aria-label="Footer" className="md:col-span-3">
          <ul className="space-y-1">
            {[...SECTION_LINKS, { href: "#accessibility", label: "Accessibility" }].map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-flex min-h-8 items-center rounded-md text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-pretty md:col-span-3">
          Icons are{" "}
          <a
            href="https://fonts.google.com/icons"
            className="text-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Material Symbols
          </a>{" "}
          by Google, under the Apache 2.0 license.
        </p>
      </LandingContainer>
    </footer>
  );
}
