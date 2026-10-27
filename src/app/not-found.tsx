import Link from "next/link";
import { FileQuestion } from "@/components/icons";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center border-b border-border bg-card px-3 sm:px-4">
        <Logo className="ml-1" />
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-md flex-col items-center rounded-[28px] border border-border bg-card px-6 py-12 text-center sm:px-10">
          <span className="mb-5 flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
            <FileQuestion className="size-7" aria-hidden />
          </span>
          <p className="tabular text-sm font-medium text-primary">Error 404</p>
          <h1 className="mt-2 text-[1.625rem] leading-tight font-medium text-balance text-foreground">
            We couldn&apos;t find that page.
          </h1>
          <p className="mt-2 max-w-sm text-[0.9375rem] text-pretty text-muted-foreground">
            The link may be out of date, or the demo data was reset.
          </p>
          <Button asChild className="mt-8">
            <Link href="/">Back to Markwise</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
