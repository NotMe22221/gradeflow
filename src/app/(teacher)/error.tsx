"use client";

import Link from "next/link";
import { CircleAlert, RefreshCw } from "@/components/icons";

import { PageContainer } from "@/components/page-header";
import { Button } from "@/components/ui/button";

/**
 * A teacher page that failed to load (a server error, or a request that never
 * reached the server), shown inside the app shell so the navigation stays.
 * Plain words only: the error's message and stack are never shown.
 */
export default function TeacherError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <PageContainer className="flex justify-center">
      <div className="flex w-full max-w-lg flex-col items-center rounded-[28px] border border-border bg-card px-6 py-12 text-center sm:mt-6 sm:px-10">
        <span className="mb-5 flex size-16 items-center justify-center rounded-full bg-warning-soft text-warning-soft-foreground">
          <CircleAlert className="size-7" aria-hidden />
        </span>
        <h1 className="text-[1.625rem] leading-tight font-medium text-balance text-foreground">
          Something went wrong loading this page.
        </h1>
        <p className="mt-2 max-w-sm text-[0.9375rem] text-pretty text-muted-foreground">
          It may be a brief connection problem. Try again, or go back to Home.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => retry()}>
            <RefreshCw aria-hidden />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Go to Home</Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
