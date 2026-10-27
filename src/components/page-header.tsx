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
 * Corner art for PageHeader's `decor` slot: a paint blob bleeding off the
 * page's top right corner, a smaller one over its edge (both run up under the
 * glass app bar), X marks on the big one and a ring. Everything keeps to the
 * top 4rem of the box, the page's top padding and the title's line, so a row
 * of actions (bottom aligned) stays on the blob's plain paint. Pass it as
 * `decor={<HeaderDecor tones={["mint", "yellow"]} />}`.
 */
export function HeaderDecor({ tones = ["yellow", "coral"] }: { tones?: [PopTone, PopTone] }) {
  const [main, second] = tones;
  return (
    <>
      <Blob shape={4} tone={main} className="-top-32 -right-24 w-64 lg:-top-36 lg:-right-20 lg:w-72" />
      <Blob shape={2} tone={second} className="-top-10 right-44 w-20 lg:right-52 lg:w-24" />
      <XGrid cols={4} rows={2} className="top-2 right-8 w-24 lg:right-12 lg:w-28" />
      <Ring tone="pink" className="top-10 right-[20rem] hidden w-7 lg:block" />
    </>
  );
}

/**
 * A page's title row: a big display title with the pink period, an optional
 * eyebrow and one-line description, and the page actions on the right.
 *
 * `decor` (Bold look only) goes in a box anchored to the page's top right
 * corner, from md up. The title and description keep clear of it: their
 * column stops short of the art, so decor never sits under text. Phones skip
 * it. Pages are clipped sideways by <main>, so a blob can bleed off the edge.
 * Art other than HeaderDecor should keep within 16rem of the right edge at md
 * and 22rem at lg.
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
  /** Corner art, e.g. <HeaderDecor />. Hidden on phones and in the Calm look. */
  decor?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      {decor ? (
        // Anchored at the page's top right corner (the container's padding, outside the header).
        <div
          aria-hidden
          data-decor=""
          className="pointer-events-none absolute -z-10 hidden md:-top-8 md:-right-6 md:block md:h-[calc(100%+2rem)] md:w-80 lg:-top-10 lg:-right-8 lg:h-[calc(100%+2.5rem)] lg:w-96"
        >
          {decor}
        </div>
      ) : null}
      {/* With decor, the text stops short of it (HeaderDecor reaches 16rem in from the right edge at md, 22rem at lg). */}
      <div className={cn("min-w-0 space-y-2", decor && "md:max-w-[calc(100%-17rem)] lg:max-w-[calc(100%-23rem)]")}>
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
