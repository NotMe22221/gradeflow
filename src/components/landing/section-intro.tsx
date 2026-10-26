import { cn } from "@/lib/utils";

/** Heading and lede shared by the landing page sections. Reading text stays under 65ch. */
export function SectionIntro({
  id,
  title,
  description,
  className,
}: {
  /** Id of the heading, for the section's aria-labelledby. */
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <h2
        id={id}
        className="text-[1.75rem] leading-[1.2] font-medium tracking-[-0.015em] text-balance text-foreground sm:text-[2.25rem] sm:leading-[1.15]"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-4 max-w-[65ch] text-base leading-7 text-pretty text-muted-foreground sm:text-[1.0625rem] sm:leading-8">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** Shared horizontal frame for landing sections: a 16px gutter on phones. */
export function LandingContainer({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

/** Vertical rhythm for a landing section (8pt scale). */
export const SECTION_SPACING = "py-16 sm:py-24";
