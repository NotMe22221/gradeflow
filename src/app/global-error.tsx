"use client";

import "@fontsource-variable/roboto";
import "@fontsource-variable/figtree";

import "./globals.css";
import { LogoMark } from "@/components/brand/logo";
import { CircleAlert, RefreshCw } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { DEFAULT_PREFERENCES, htmlAttributes } from "@/lib/preferences/constants";

/**
 * The last resort when the root layout itself fails: it replaces the whole
 * document, so it brings its own <html>, styles and default look ("system"
 * theme). Plain words only: the error's message and stack are never shown.
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en" {...htmlAttributes(DEFAULT_PREFERENCES)}>
      <body>
        <title>Something went wrong · Markwise</title>
        <main id="main" className="flex min-h-dvh items-center justify-center bg-background px-4 py-16">
          <div className="flex w-full max-w-lg flex-col items-center rounded-[28px] border border-border bg-card px-6 py-12 text-center sm:px-10">
            <LogoMark className="mb-8" />
            <span className="mb-5 flex size-16 items-center justify-center rounded-full bg-warning-soft text-warning-soft-foreground">
              <CircleAlert className="size-7" aria-hidden />
            </span>
            <h1 className="text-[1.625rem] leading-tight font-medium text-balance text-foreground">
              Something went wrong loading Markwise.
            </h1>
            <p className="mt-2 max-w-sm text-[0.9375rem] text-pretty text-muted-foreground">
              It may be a brief connection problem. Try again, or reload the start page.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={() => retry()}>
                <RefreshCw aria-hidden />
                Try again
              </Button>
              <Button asChild variant="outline">
                {/* A full page load, not a client navigation: the app's own layout is what failed. */}
                <a href="/">Go to the start page</a>
              </Button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
