import Link from "next/link";
import { ArrowRight } from "@/components/icons";

import { Logo } from "@/components/brand/logo";
import { DemoSignInForm } from "@/components/landing/demo-sign-in";
import { Button } from "@/components/ui/button";

export const SECTION_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#students", label: "For students" },
  { href: "#trust", label: "Trust" },
  { href: "#judges", label: "For judges" },
  { href: "#faq", label: "FAQ" },
];

/**
 * The 64px bar, like the product's: wordmark, section links, and the two ways
 * in. "View the demo" is the one filled button; signed-in visitors get
 * "Open app" instead.
 */
export function SiteHeader({
  appHref,
  demoLogin,
  sectionBase = "",
}: {
  appHref: string | null;
  demoLogin: boolean;
  /** "/" on pages other than the landing page, so the section links lead back to it. */
  sectionBase?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="@container mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6 lg:gap-6 lg:px-8">
        <Logo />
        {/* Shown once the whole row fits on one line (about 58rem of links, wordmark and buttons). A
            container query in rem follows the text-size setting, so larger text hides the links sooner
            instead of wrapping them or squeezing the wordmark. */}
        <nav aria-label="Page sections" className="hidden items-center @min-[58.5rem]:flex">
          {SECTION_LINKS.map((link) => (
            <a
              key={link.href}
              href={`${sectionBase}${link.href}`}
              className="inline-flex h-10 items-center rounded-full px-3.5 text-[0.875rem] font-medium text-muted-foreground transition-colors outline-none hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {appHref ? (
            <Button asChild>
              <Link href={appHref}>
                Open app
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : demoLogin ? (
            <>
              <DemoSignInForm role="student" variant="text" className="hidden md:block">
                See the student view
              </DemoSignInForm>
              <DemoSignInForm role="teacher" buttonClassName="px-5 max-[22.4rem]:px-4">
                View the demo
              </DemoSignInForm>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
