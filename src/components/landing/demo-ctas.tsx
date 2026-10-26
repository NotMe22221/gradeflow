import { ArrowRight } from "@/components/icons";

import { DemoSignInForm } from "@/components/landing/demo-sign-in";
import { cn } from "@/lib/utils";

/**
 * The two ways into the demo: the seeded teacher account (the one filled
 * button) or a seeded student's view (outlined). Each is a form that signs in
 * and redirects, so it works before hydration.
 */
export function DemoCtas({
  demoLogin,
  note = "Opens a sample class with made-up students. No sign-up, and no API key needed.",
  className,
}: {
  demoLogin: boolean;
  note?: React.ReactNode;
  className?: string;
}) {
  if (!demoLogin) {
    return (
      <p className={cn("text-[0.875rem] text-muted-foreground", className)}>
        One-click demo sign-in is turned off for this deployment.
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 min-[30rem]:flex-row min-[30rem]:flex-wrap">
        <DemoSignInForm role="teacher" size="lg" buttonClassName="w-full min-[30rem]:w-auto">
          View the demo
          <ArrowRight aria-hidden />
        </DemoSignInForm>
        <DemoSignInForm role="student" size="lg" variant="outline" buttonClassName="w-full min-[30rem]:w-auto">
          See the student view
        </DemoSignInForm>
      </div>
      {note ? <p className="mt-4 text-[0.875rem] leading-6 text-muted-foreground">{note}</p> : null}
    </div>
  );
}
