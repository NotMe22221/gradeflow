"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signInAsDemoStudent, signInAsDemoTeacher } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<typeof Button>;

/**
 * One-click demo sign-in. A real <form> posting to the server action, so it
 * works before hydration; the button shows a pending state while the session
 * is created and the redirect lands.
 */
export function DemoSignInForm({
  role,
  children,
  variant,
  size,
  className,
  buttonClassName,
}: {
  role: "teacher" | "student";
  children: React.ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  buttonClassName?: string;
}) {
  return (
    <form action={role === "teacher" ? signInAsDemoTeacher : signInAsDemoStudent} className={className}>
      <SubmitButton variant={variant} size={size} className={buttonClassName}>
        {children}
      </SubmitButton>
    </form>
  );
}

function SubmitButton({
  children,
  variant,
  size,
  className,
}: {
  children: React.ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending}
      className={cn("relative", className)}
    >
      {/* Keep the label in place while pending so the button never changes width. */}
      <span className={cn("inline-flex items-center gap-2", pending && "invisible")}>{children}</span>
      {pending ? (
        <span className="absolute inset-0 flex items-center justify-center" role="status">
          <LoaderCircle className="animate-spin" aria-hidden />
          <span className="sr-only">Opening the demo</span>
        </span>
      ) : null}
    </Button>
  );
}
