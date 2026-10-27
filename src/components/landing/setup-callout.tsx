import { Database } from "@/components/icons";

import { LandingContainer } from "@/components/landing/section-intro";
import { setupMessage, type SetupIssue, type SetupPlace } from "@/lib/auth/demo-accounts";

/**
 * Shown when a demo sign-in couldn't find its account (`/?setup=<issue>`):
 * what is wrong, and the fix for where the app runs. Only Prisma's local dev
 * database is told to run `npm run seed`, which refuses any other database.
 */
export function SetupCallout({ issue, place }: { issue: SetupIssue; place: SetupPlace }) {
  const message = setupMessage(issue, place);
  return (
    <LandingContainer className="pt-6">
      <div
        role="status"
        className="mx-auto flex max-w-3xl items-start gap-3 rounded-2xl bg-warning-soft px-4 py-3.5 text-sm text-warning-soft-foreground"
      >
        <Database className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="min-w-0 space-y-1.5 text-pretty">
          <p>
            <span className="font-medium text-foreground">{message.title}</span> {message.body}
          </p>
          {message.command ? (
            <p>
              <code className="rounded-md bg-card px-1.5 py-0.5 font-mono text-[0.8125rem] text-foreground">
                {message.command}
              </code>
            </p>
          ) : null}
        </div>
      </div>
    </LandingContainer>
  );
}
