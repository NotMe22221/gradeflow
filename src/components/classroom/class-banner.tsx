import Link from "next/link";

import { BannerArt } from "@/components/classroom/banner-art";
import { bannerMotif, classTheme } from "@/lib/ui/class-theme";
import { cn } from "@/lib/utils";

/**
 * A scrim in the class color behind a block of banner text, so the line art
 * shows beside the text but never runs behind a line of it, however long the
 * class name or section is and however narrow the banner gets. Render it as
 * the first child of a `relative` text block with at least 2rem of right
 * padding: it is solid under the text and fades out over the last 1.5rem.
 * `fade` also lets it fade over 0.75rem past its top or bottom edge, so art
 * next to a shorter line eases out behind this one instead of stopping at a
 * hard edge. It sits at `-z-10` after the art, so it paints over the art and
 * under the text.
 */
function Scrim({ color, fade }: { color: string; fade?: "top" | "bottom" }) {
  const masks = ["linear-gradient(90deg, #000 calc(100% - 1.5rem), transparent)"];
  if (fade === "top") masks.push("linear-gradient(180deg, transparent, #000 0.75rem)");
  if (fade === "bottom") masks.push("linear-gradient(180deg, #000 calc(100% - 0.75rem), transparent)");
  const mask = masks.join(", ");
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 -z-10",
        fade === "top" ? "-top-3 bottom-0" : fade === "bottom" ? "top-0 -bottom-3" : "inset-y-0"
      )}
      style={{
        backgroundColor: color,
        maskImage: mask,
        WebkitMaskImage: mask,
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    />
  );
}

/**
 * The themed header of a class page (Stream tab), like Classroom's class
 * banner: class name and section in white on the class color, with a subject
 * illustration on the right.
 */
export function ClassBanner({
  name,
  section,
  subject,
  children,
  className,
}: {
  name: string;
  section?: string | null;
  subject?: string | null;
  /** Extra content under the title (e.g. teacher name or class code). */
  children?: React.ReactNode;
  className?: string;
}) {
  const theme = classTheme({ name });
  return (
    <div
      className={cn("relative isolate flex overflow-hidden rounded-2xl text-white", className)}
      style={{ backgroundColor: theme.color }}
    >
      <BannerArt
        motif={bannerMotif({ name, subject })}
        className="pointer-events-none absolute right-0 bottom-0 -z-10 h-full w-auto max-w-[70%] text-white opacity-90 sm:max-w-[55%]"
      />
      {/* Full height and as wide as the text. On phones it wraps at 80%, so the art keeps the right edge. */}
      <div className="relative flex min-h-40 w-fit max-w-[80%] flex-col justify-end py-6 pr-10 pl-6 sm:min-h-52 sm:max-w-full sm:py-8 sm:pr-12 sm:pl-8">
        <Scrim color={theme.color} />
        <h1 className="text-[28px] leading-tight font-semibold text-balance sm:text-[36px]">{name}</h1>
        {section || subject ? (
          <p className="mt-1 text-base text-pretty text-white/90 sm:text-lg">
            {[section, subject].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {children ? <div className="mt-3 text-sm text-white/90">{children}</div> : null}
      </div>
    </div>
  );
}

/** The compact banner at the top of a class card on Home. */
export function ClassCardBanner({
  name,
  section,
  subject,
  href,
  meta,
}: {
  name: string;
  section?: string | null;
  subject?: string | null;
  href: string;
  /** A third line, e.g. the teacher's name on student cards. */
  meta?: string | null;
}) {
  const theme = classTheme({ name });
  return (
    // A size container, so the title link's overlay can match the banner's width (100cqw).
    <div
      className="@container relative isolate flex h-[104px] flex-col overflow-hidden text-white"
      style={{ backgroundColor: theme.color }}
    >
      <BannerArt
        motif={bannerMotif({ name, subject })}
        className="pointer-events-none absolute -right-2 -bottom-2 -z-10 h-[112px] w-auto max-w-[70%] text-white opacity-80"
      />
      {/* Each text block is only as wide as its text. A block may overhang the right edge by
          1rem (clipped), so a full-width line keeps the banner's 1rem side padding. */}
      <div className="relative w-fit max-w-[calc(100%+1rem)] pt-4 pr-8 pl-4">
        <Scrim color={theme.color} fade="bottom" />
        {/* The link's overlay starts at the banner's top-left corner and is banner-sized, so
            the whole banner is one click target. */}
        <Link
          href={href}
          className="block truncate rounded-sm text-[22px] leading-7 font-medium outline-none after:absolute after:top-0 after:left-0 after:z-10 after:h-[104px] after:w-[100cqw] hover:underline focus-visible:after:ring-2 focus-visible:after:ring-white focus-visible:after:ring-inset"
        >
          <span className="font-display">{name}</span>
        </Link>
      </div>
      <div className="relative w-fit max-w-[calc(100%+1rem)] flex-1 pr-8 pl-4">
        <Scrim color={theme.color} fade="top" />
        <p className="truncate text-sm text-white/90">{[section, subject].filter(Boolean).join(" · ")}</p>
        {meta ? <p className="mt-2 truncate text-[13px] text-white/90">{meta}</p> : null}
      </div>
    </div>
  );
}
