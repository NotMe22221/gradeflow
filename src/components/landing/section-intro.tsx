import { Period } from "@/components/decor/period";
import { cn } from "@/lib/utils";

/**
 * Heading and lede shared by the landing page sections: a heavy display
 * heading, and a lede that stays under 65ch. A plain-text title gets the
 * Bold look's accent period ("How it works.", hidden from screen readers)
 * unless it already ends in punctuation or `dot` is false. On a section band
 * (bg-band-*), pass tone="band": the heading and lede take the band's text
 * color, and the period becomes a paint dot (decor/period.tsx).
 */
export function SectionIntro({
  id,
  title,
  description,
  dot = true,
  tone = "canvas",
  className,
}: {
  /** Id of the heading, for the section's aria-labelledby. */
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** End a plain-text title with an accent period. */
  dot?: boolean;
  /** "band" when the intro sits on a bg-band-* fill. */
  tone?: "canvas" | "band";
  className?: string;
}) {
  const onBand = tone === "band";
  return (
    <div className={cn("max-w-3xl", className)}>
      <h2 id={id} className={cn("display-section", onBand ? "text-band-foreground" : "text-foreground")}>
        {title}
        {dot && typeof title === "string" && !/[.?!:]$/.test(title) ? <Period onBand={onBand} /> : null}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-5 max-w-[65ch] text-base leading-7 text-pretty sm:text-[1.125rem] sm:leading-8",
            onBand ? "text-band-foreground" : "text-muted-foreground"
          )}
        >
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
