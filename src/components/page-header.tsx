import { Blob, Ring, XGrid, type PopTone } from "@/components/decor/decor";
import { Period as TitlePeriod } from "@/components/decor/period";
import { cn } from "@/lib/utils";

/** Standard page container: generous whitespace on an 8pt rhythm. */
export function PageContainer({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10", className)}
      {...props}
    />
  );
}

/** The pink period after a page title (decor/period.tsx). */
export { TitlePeriod };

/**
 * The page-title corner art, the one preset for PageHeader's `decor` slot on
 * every page that has one: a big paint blob in the page's top right corner
 * (bleeding off the page's right edge), X marks on it, a smaller blob in the
 * second tone and, on wide screens, a pink ring. Pass it as
 * `decor={<HeaderDecor tones={["mint", "yellow"]} />}`.
 *
 * It stays inside PageHeader's slot (see there): the big blob is as tall as
 * the slot (8rem at most) and every other piece keeps to the slot's top
 * 4.5rem, so nothing reaches the app bar above or the content below. The
 * actions (bottom right) sit on the big blob's plain paint, under the X marks.
 */
export function HeaderDecor({ tones = ["yellow", "coral"] }: { tones?: [PopTone, PopTone] }) {
  const [main, second] = tones;
  return (
    <>
      <Blob shape={4} tone={main} className="top-0 -right-4 aspect-square h-full max-h-40 w-auto" />
      <Blob shape={2} tone={second} className="top-1 right-[6.5rem] w-16 xl:right-[7.5rem] xl:w-20" />
      <XGrid cols={4} rows={2} className="top-3 right-6 w-20 xl:right-8 xl:w-24" />
      <Ring tone="pink" className="top-10 right-[14rem] hidden w-8 xl:block" />
    </>
  );
}

/**
 * A page's title row: a big display title with the pink period, an optional
 * eyebrow and one-line description, and the page actions on the right.
 *
 * `decor` (Bold look only, from md up; phones skip it) is HeaderDecor. Its
 * slot is the header's own box, at its right, grown up into the page's top
 * padding (1.5rem; pages pad at least 2rem there from md up, so it stays
 * clear of the app bar) and out over the page's right padding, and it clips
 * anything taller: decor never paints above or below the header. With decor
 * the header is at least 4.5rem tall, so a title-only header still has room
 * for the art, and the title column stops short of it (17rem from the right
 * edge, 22rem from xl), so decor never sits under text. Pages are clipped
 * sideways by <main>, so a blob can bleed off the edge.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  decor,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  /** Corner art: <HeaderDecor tones={...} />. Hidden on phones and in the Calm look. */
  decor?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
        decor && "md:min-h-[5.5rem]",
        className
      )}
    >
      {decor ? (
        <div
          aria-hidden
          data-decor=""
          className="pointer-events-none absolute -z-10 hidden overflow-y-clip md:-top-6 md:-right-6 md:bottom-0 md:block md:w-[17.5rem] lg:-right-8 lg:w-[18rem] xl:w-[23rem]"
        >
          {decor}
        </div>
      ) : null}
      <div className={cn("min-w-0 space-y-2", decor && "md:max-w-[calc(100%-17rem)] xl:max-w-[calc(100%-22rem)]")}>
        {eyebrow ? (
          <div className="text-[0.8125rem] font-semibold text-muted-foreground">{eyebrow}</div>
        ) : null}
        <h1 className="display-title text-foreground">
          {title}
          {typeof title === "string" && !/[.?!]$/.test(title) ? <TitlePeriod /> : null}
        </h1>
        {description ? (
          <p className="max-w-2xl text-[0.9375rem] text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 md:max-w-[60%] md:shrink-0 md:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}
