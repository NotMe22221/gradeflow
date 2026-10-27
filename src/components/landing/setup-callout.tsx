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
        className="mx-auto flex max-w-3xl items-start gap-3 rounded-3xl bg-warning-soft px-5 py-4 text-sm leading-6 text-warning-soft-foreground"
      >
        <Database className="mt-1 size-4 shrink-0" aria-hidden />
        <div className="min-w-0 space-y-1.5 text-pretty">
          <p>
            <span className="font-semibold text-foreground">{message.title}</span> {message.body}
          </p>
          {message.command ? (
            <p>
              <code className="rounded-lg bg-card px-2 py-0.5 font-mono text-[0.8125rem] text-foreground">
                {message.command}
              </code>
            </p>
          ) : null}
        </div>
      </div>
    </LandingContainer>
  );
}
