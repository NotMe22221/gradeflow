import { DemoSignInForm } from "@/components/landing/demo-sign-in";
import { cn } from "@/lib/utils";

/**
 * The pair of demo buttons used in the hero and the closing band: one click
 * into the seeded teacher account (the filled primary action), or into a
 * seeded student's view (outlined).
 */
export function DemoCtas({
  demoLogin,
  primaryLabel,
  className,
}: {
  demoLogin: boolean;
  primaryLabel: React.ReactNode;
  className?: string;
}) {
  if (!demoLogin) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        One-click demo sign-in is turned off for this deployment.
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        <DemoSignInForm role="teacher" size="lg" buttonClassName="w-full sm:w-auto">
          {primaryLabel}
        </DemoSignInForm>
        <DemoSignInForm role="student" size="lg" variant="outline" buttonClassName="w-full sm:w-auto">
          See the student view
        </DemoSignInForm>
      </div>
      <p className="mt-4 text-[13px] text-muted-foreground">Demo uses synthetic students and papers only.</p>
    </div>
  );
}
