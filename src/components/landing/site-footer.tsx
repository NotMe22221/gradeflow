import { LogoMark } from "@/components/brand/logo";
import { LandingContainer } from "@/components/landing/section-intro";
import { SECTION_LINKS } from "@/components/landing/site-header";

/** `sectionBase` is "/" on pages other than the landing page, so its section links lead back to it. */
export function SiteFooter({ sectionBase = "" }: { sectionBase?: string }) {
  return (
    <footer className="border-t border-border bg-card">
      <LandingContainer className="grid gap-10 py-14 text-[0.9375rem] leading-7 text-muted-foreground sm:py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="flex items-center gap-3">
            <LogoMark className="size-10" />
            <span className="display-title text-foreground">
              Markwise<span className="text-primary">.</span>
            </span>
          </p>
          <p className="mt-5 max-w-[48ch] text-pretty">
            A hackathon demo. Every student, paper and grade in it is made up. Works alongside your LMS through CSV
            export.
          </p>
        </div>
        <nav aria-label="Footer" className="md:col-span-4">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
            {[
              ...SECTION_LINKS.map((link) => ({ ...link, href: `${sectionBase}${link.href}` })),
              { href: `${sectionBase}#accessibility`, label: "Accessibility" },
              { href: "/try", label: "Try it on a paper" },
              { href: "/evidence", label: "Evidence" },
            ].map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-flex min-h-8 items-center rounded-md font-medium text-foreground underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
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
