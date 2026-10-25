import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center border-b border-border bg-card px-4">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <EmptyState
          icon={FileQuestion}
          title="We couldn't find that page."
          description="The link may be out of date, or the demo data was reset."
          action={
            <Button asChild>
              <Link href="/">Back to GradeFlow</Link>
            </Button>
          }
          className="w-full max-w-md"
        />
      </main>
    </div>
  );
}
