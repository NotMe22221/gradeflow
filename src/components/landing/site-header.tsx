import Link from "next/link";
import { ArrowRight } from "@/components/icons";

import { Logo } from "@/components/brand/logo";
import { DemoSignInForm } from "@/components/landing/demo-sign-in";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#approval-gate", label: "Approval gate" },
];

/** A white 64px app bar, like the product's: logo, section links, and one filled action. */
export function SiteHeader({ appHref, demoLogin }: { appHref: string | null; demoLogin: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-3 sm:px-4 lg:gap-8 lg:px-6">
        <Logo className="ml-1" />
        <nav aria-label="Page sections" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {appHref ? (
            <Button asChild>
              <Link href={appHref}>
                Open app
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : demoLogin ? (
            <DemoSignInForm role="teacher" buttonClassName="px-5 max-[359px]:px-4">
              View the demo
            </DemoSignInForm>
          ) : null}
        </div>
      </div>
    </header>
  );
}
