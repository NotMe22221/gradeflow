import Link from "next/link";
import { ArrowLeft, FileQuestion } from "@/components/icons";

import { Logo } from "@/components/brand/logo";
import { Blob, DotGrid, XGrid } from "@/components/decor/decor";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="glass-bar sticky top-0 z-40 flex h-16 shrink-0 items-center px-3 sm:px-4">
        <Logo className="ml-1" />
      </header>
      {/* Paint at the corners, clear of the text: a yellow blob (it drifts) with X marks top right, a mint one
          bottom left, dots bottom right. */}
      <main id="main" className="relative isolate flex flex-1 items-center overflow-hidden py-16 sm:py-24">
        <Blob
          shape={1}
          tone="yellow"
          float
          className="-top-20 -right-20 w-48 sm:-top-32 sm:-right-24 sm:w-80 lg:-top-40 lg:-right-32 lg:w-[36rem]"
        />
        <XGrid cols={6} rows={4} className="hidden sm:block sm:top-10 sm:right-10 sm:w-32 lg:top-16 lg:right-16 lg:w-44" />
        <Blob shape={6} tone="mint" className="-bottom-24 -left-20 w-48 sm:-bottom-32 sm:-left-24 sm:w-80" />
        <DotGrid cols={9} rows={5} className="hidden md:block md:right-[10%] md:bottom-14 md:w-44" />

        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[0.9375rem] font-semibold text-foreground">
            <FileQuestion aria-hidden className="size-[1.125rem] text-primary" />
            <span className="tabular">Error 404</span>
          </p>
          <h1 className="display-hero mt-6 max-w-[10em] text-foreground">
            We couldn&rsquo;t find that page<span className="text-primary">.</span>
          </h1>
          <p className="mt-6 max-w-[48ch] text-[1.0625rem] leading-8 text-pretty text-muted-foreground sm:text-[1.1875rem] sm:leading-9">
            The link may be out of date, or the demo data was reset.
          </p>
          <Button asChild size="lg" className="mt-10">
            <Link href="/">
              <ArrowLeft aria-hidden />
              Back to Markwise
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
