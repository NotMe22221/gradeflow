import { Database } from "lucide-react";

import { LandingContainer } from "@/components/landing/section-intro";

/** Shown when a demo sign-in found no seeded accounts (`/?setup=seed`). */
export function SetupCallout() {
  return (
    <LandingContainer className="pt-6">
      <div
        role="status"
        className="mx-auto flex max-w-3xl items-start gap-3 rounded-2xl bg-warning-soft px-4 py-3.5 text-sm text-warning-soft-foreground"
      >
        <Database className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <span className="font-medium text-foreground">Demo data isn&apos;t loaded yet.</span> Run{" "}
          <code className="rounded-md bg-card px-1.5 py-0.5 font-mono text-[13px] text-foreground">
            npm run seed
          </code>
          , then click View the demo.
        </p>
      </div>
    </LandingContainer>
  );
}
