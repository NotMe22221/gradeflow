import Link from "next/link";
import { FileQuestion } from "@/components/icons";

import { PageContainer } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function TeacherNotFound() {
  return (
    <PageContainer className="flex justify-center">
      <div className="flex w-full max-w-lg flex-col items-center rounded-[28px] border border-border bg-card px-6 py-12 text-center sm:mt-6 sm:px-10">
        <span className="mb-5 flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
          <FileQuestion className="size-7" aria-hidden />
        </span>
        <h1 className="text-[1.625rem] leading-tight font-medium text-balance text-foreground">We couldn&apos;t find that page.</h1>
        <p className="mt-2 max-w-sm text-[0.9375rem] text-pretty text-muted-foreground">
          It may belong to another class, or the demo data was reset.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/dashboard">Go to Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/classes">See your classes</Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
