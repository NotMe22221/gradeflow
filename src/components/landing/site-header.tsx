import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { DemoSignInForm } from "@/components/landing/demo-sign-in";
import { LandingContainer } from "@/components/landing/section-intro";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#approval-gate", label: "Approval gate" },
];

export function SiteHeader({ appHref, demoLogin }: { appHref: string | null; demoLogin: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <LandingContainer className="flex h-16 items-center gap-8">
        <Logo />
        <nav aria-label="Page sections" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {appHref ? (
            <Button asChild size="sm">
              <Link href={appHref}>
                Open app
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : demoLogin ? (
            <DemoSignInForm role="teacher" size="sm">
              View the demo
            </DemoSignInForm>
          ) : null}
        </div>
      </LandingContainer>
    </header>
  );
}
