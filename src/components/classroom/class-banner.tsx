import { BannerArt } from "@/components/classroom/banner-art";
import { bannerMotif, classTheme } from "@/lib/ui/class-theme";
import { cn } from "@/lib/utils";

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
      className={cn("relative isolate overflow-hidden rounded-2xl px-6 py-6 text-white sm:px-8 sm:py-8", className)}
      style={{ backgroundColor: theme.color }}
    >
      <BannerArt
        motif={bannerMotif({ name, subject })}
        className="pointer-events-none absolute right-0 bottom-0 -z-10 h-full w-auto max-w-[70%] text-white opacity-90 sm:max-w-[55%]"
      />
      <div className="flex min-h-28 flex-col justify-end sm:min-h-36">
        <h1 className="text-[28px] leading-tight font-semibold text-balance sm:text-[36px]">{name}</h1>
        {section || subject ? (
          <p className="mt-1 text-base text-white/90 sm:text-lg">{[section, subject].filter(Boolean).join(" · ")}</p>
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
    <div className="relative isolate h-[104px] overflow-hidden px-4 pt-4 text-white" style={{ backgroundColor: theme.color }}>
      <BannerArt
        motif={bannerMotif({ name, subject })}
        className="pointer-events-none absolute -right-6 -bottom-4 -z-10 h-[120px] w-auto text-white opacity-80"
      />
      <a
        href={href}
        className="block truncate rounded-sm text-[22px] leading-7 font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white"
      >
        <span className="font-display">{name}</span>
      </a>
      <p className="truncate text-sm text-white/90">{[section, subject].filter(Boolean).join(" · ")}</p>
      {meta ? <p className="mt-2 truncate text-[13px] text-white/90">{meta}</p> : null}
    </div>
  );
}
