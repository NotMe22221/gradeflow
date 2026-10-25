import { cn } from "@/lib/utils";

/** Eyebrow, title, and lede shared by the landing page sections. */
export function SectionIntro({
  id,
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  id: string;
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
      <h2
        id={id}
        className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl sm:leading-[1.15]"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-7 text-pretty text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

/** Shared horizontal frame for landing sections. */
export function LandingContainer({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}
