import { CircleCheck, CircleHalf, CircleMinus, MessageCircleQuestion, type IconComponent } from "@/components/icons";

import {
  CHECKED_ON,
  DIMENSION_GROUPS,
  DIMENSIONS,
  MARKWISE,
  PRODUCTS,
  STATUS_LABELS,
  STATUS_MEANINGS,
  STATUSES,
  type Cell,
  type Dimension,
  type DimensionKey,
  type Product,
  type Status,
} from "@/components/landing/comparison-data";
import { ComparisonScroll } from "@/components/landing/comparison-scroll";
import { ExternalAnchor } from "@/components/landing/external-anchor";
import { cn } from "@/lib/utils";

/*
 * The comparison table in the landing page's "For judges" section. Kept apart
 * from judges.tsx (which pulls in the demo sign-in server actions) so tests
 * can render it. The data and its ground rules live in comparison-data.ts.
 */

/** Shape and color per status; the word beside the icon carries the meaning. */
const STATUS_ICON: Record<Status, { icon: IconComponent; filled: boolean; iconClass: string; textClass: string }> = {
  yes: { icon: CircleCheck, filled: true, iconClass: "text-success", textClass: "font-medium text-foreground" },
  partial: { icon: CircleHalf, filled: false, iconClass: "text-warning", textClass: "font-medium text-foreground" },
  no: {
    icon: CircleMinus,
    filled: false,
    iconClass: "text-muted-foreground",
    textClass: "font-medium text-foreground",
  },
  unknown: {
    icon: MessageCircleQuestion,
    filled: false,
    iconClass: "text-muted-foreground",
    textClass: "text-muted-foreground",
  },
};

/** The notes switch. A plain checkbox, so showing the notes works before any JavaScript loads. */
const NOTES_ID = "judges-notes";
/** Shown only while the notes switch is on (`group/judges` wraps the switch and the table). */
const WITH_NOTES = "hidden group-has-[#judges-notes:checked]/judges:block";

const DIMENSION_BY_KEY = new Map(DIMENSIONS.map((dimension) => [dimension.key, dimension]));

/*
 * The first column stays put while the products scroll under it (as in the
 * Grades spreadsheet): a solid background, a divider line, and a shadow once
 * cells have scrolled beneath it (data-more-left from ComparisonScroll).
 */
const stickyCell =
  "sticky left-0 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border after:content-[''] group-data-[more-left=true]/compare:shadow-[6px_0_8px_-6px_color-mix(in_srgb,var(--scrim)_40%,transparent)] group-data-[more-left=true]/compare:after:bg-input/60";

/*
 * On a phone with the notes off, the Markwise column stays put too, right of
 * the Feature column (8.25rem there), so each swipe shows Feature | Markwise |
 * one other product. It sits above the Feature column (z 11 and 21), so the
 * Feature shadow falls under it and only its own edge casts one. With the
 * notes on, the columns are too wide for two to stay put, so it scrolls.
 */
const pinnedMarkwise =
  "max-sm:group-not-has-[#judges-notes:checked]/judges:sticky max-sm:group-not-has-[#judges-notes:checked]/judges:left-[8.25rem] max-sm:group-not-has-[#judges-notes:checked]/judges:group-data-[more-left=true]/compare:shadow-[6px_0_8px_-6px_color-mix(in_srgb,var(--scrim)_40%,transparent)]";

/** The Markwise column's tint, opaque so cells scrolling under the pinned column don't show through. */
const markwiseTint = "bg-[color-mix(in_oklab,var(--color-primary-soft)_30%,var(--color-card))]";

const H3 = "display-title text-foreground";

/**
 * Markwise next to the six tools: heading, the notes switch, the legend, and
 * the table (rows are capabilities in groups, columns are products, Markwise
 * first). Server-rendered; only the scroll affordance runs on the client.
 */
export function ComparisonTable({ className }: { className?: string }) {
  return (
    <div className={cn("group/judges", className)}>
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-16">
        <div className="lg:col-span-7">
          <h3 id="compare-heading" className={H3}>
            Markwise next to six grading tools
          </h3>
          <p className="mt-4 max-w-[65ch] text-base leading-7 text-pretty text-muted-foreground">
            Answers come from public pages, mostly the companies&apos; own, and web search results as of {CHECKED_ON}.
            We didn&apos;t test these products. Not stated means we found nothing either way, which is not the same as
            No.
          </p>
        </div>
        <div className="lg:col-span-5 lg:justify-self-end">
          <NotesSwitch />
        </div>
      </div>

      <p className="sr-only">What the answers mean:</p>
      <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
        {STATUSES.map((status) => (
          <div key={status} className="flex items-center gap-2 text-[0.875rem] leading-6">
            <dt>
              <StatusWord status={status} legend />
            </dt>
            <dd className="text-muted-foreground">{STATUS_MEANINGS[status]}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-border bg-card">
        <ComparisonScroll label="Markwise compared with six grading tools">
          <table className="w-full min-w-[55.5rem] table-fixed border-separate border-spacing-0 text-left sm:min-w-[59.5rem] group-has-[#judges-notes:checked]/judges:min-w-[92.25rem] sm:group-has-[#judges-notes:checked]/judges:min-w-[105rem] [&>tbody:last-of-type>tr:last-child>*]:border-b-0">
            <caption className="sr-only">
              Markwise and six grading tools, compared on {DIMENSIONS.length} capabilities. Each answer is Yes, Partial,
              No or Not stated, from public pages and search results as of {CHECKED_ON}.
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className={cn(
                    stickyCell,
                    "z-20 w-[8.25rem] border-b border-border bg-card px-3 py-3 align-bottom text-[0.8125rem] font-medium text-muted-foreground sm:w-[10.5rem] sm:px-4 xl:w-[14rem] sm:group-has-[#judges-notes:checked]/judges:w-[14rem]",
                  )}
                >
                  Feature
                </th>
                {PRODUCTS.map((product) => (
                  <th
                    key={product.key}
                    scope="col"
                    className={cn(
                      "border-b border-l border-border px-2.5 py-3 align-bottom text-[0.875rem] leading-5 font-medium text-pretty",
                      product === MARKWISE
                        ? cn(pinnedMarkwise, "z-[21] bg-primary-soft text-primary-soft-foreground")
                        : "bg-card text-foreground",
                    )}
                  >
                    {product.name}
                    {product === MARKWISE ? (
                      <span className="block text-[0.875rem] leading-5 font-normal">This project</span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            {DIMENSION_GROUPS.map((group) => (
              <tbody key={group.title}>
                <tr>
                  <th
                    scope="rowgroup"
                    className={cn(
                      stickyCell,
                      "z-10 border-b border-border bg-background px-3 pt-5 pb-2 text-left align-bottom text-[0.8125rem] leading-5 font-medium text-pretty text-muted-foreground compact:pt-3 compact:pb-1.5 sm:px-4",
                    )}
                  >
                    {group.title}
                  </th>
                  {/* The column labels again, for whoever has scrolled past the header row (the
                      header can't stick to the top inside a sideways scroller). Screen readers
                      already get each column header with every cell. */}
                  {PRODUCTS.map((product) => (
                    <td
                      key={product.key}
                      aria-hidden="true"
                      className={cn(
                        "border-b border-l border-border bg-background px-2.5 pt-5 pb-2 align-bottom text-[0.8125rem] leading-5 text-pretty text-muted-foreground compact:pt-3 compact:pb-1.5",
                        product === MARKWISE && cn(pinnedMarkwise, "z-[11]"),
                      )}
                    >
                      {product.shortName ?? product.name}
                    </td>
                  ))}
                </tr>
                {group.keys.map((key) => (
                  <DimensionRow key={key} dimensionKey={key} />
                ))}
              </tbody>
            ))}
          </table>
        </ComparisonScroll>
      </div>
    </div>
  );
}

function DimensionRow({ dimensionKey }: { dimensionKey: DimensionKey }) {
  const dimension = DIMENSION_BY_KEY.get(dimensionKey);
  if (!dimension) return null;
  return (
    <tr>
      <th
        scope="row"
        className={cn(
          stickyCell,
          "z-10 border-b border-border bg-card px-3 py-cell align-top text-[0.875rem] leading-5 font-medium text-pretty text-foreground sm:px-4",
        )}
      >
        {dimension.short}
        <span className="mt-1 hidden text-[0.8125rem] leading-5 font-normal text-muted-foreground sm:group-has-[#judges-notes:checked]/judges:block">
          {dimension.label}
        </span>
      </th>
      {PRODUCTS.map((product) => (
        <td
          key={product.key}
          className={cn(
            "border-b border-l border-border px-2.5 py-cell align-top",
            product === MARKWISE ? cn(pinnedMarkwise, "z-[11]", markwiseTint) : "bg-card",
          )}
        >
          <StatusCell cell={product.cells[dimensionKey]} product={product} dimension={dimension} />
        </td>
      ))}
    </tr>
  );
}

/**
 * An icon and a word, never color alone. In the legend every term is
 * medium-weight foreground, so "Not stated" stands apart from its muted
 * definition; in the table, Not stated stays muted.
 */
export function StatusWord({ status, legend = false }: { status: Status; legend?: boolean }) {
  const { icon: Icon, filled, iconClass, textClass } = STATUS_ICON[status];
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <Icon filled={filled} aria-hidden className={cn("size-5", iconClass)} />
      <span className={legend ? "font-medium text-foreground" : textClass}>{STATUS_LABELS[status]}</span>
    </span>
  );
}

/** The status, then (with the notes on) the note and a link to the page it rests on. */
function StatusCell({ cell, product, dimension }: { cell: Cell; product: Product; dimension: Dimension }) {
  return (
    <>
      <span className="block text-[0.875rem] leading-5">
        <StatusWord status={cell.status} />
      </span>
      <span className={cn(WITH_NOTES, "mt-1.5 text-[0.8125rem] leading-5 text-pretty text-muted-foreground")}>
        {cell.note}
        {cell.sourceUrl ? (
          <>
            {" "}
            <ExternalAnchor href={cell.sourceUrl}>
              Source
              <span className="sr-only">
                {" "}
                for {product.name}: {dimension.short}
              </span>
            </ExternalAnchor>
          </>
        ) : null}
      </span>
    </>
  );
}

/**
 * A Material 3 switch drawn over a real checkbox (role="switch"): the label
 * names it, Space toggles it, and the focus ring shows on the track. In
 * forced colors it keeps system colors so the on and off states still differ.
 */
function NotesSwitch() {
  return (
    <label className="inline-flex min-h-12 cursor-pointer items-center gap-3 text-[0.9375rem] font-medium text-foreground select-none">
      <input id={NOTES_ID} type="checkbox" role="switch" className="peer sr-only" />
      <span
        aria-hidden
        className="relative inline-flex h-8 w-[3.25rem] shrink-0 rounded-full border-2 border-input bg-secondary transition-colors duration-150 peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card before:absolute before:top-1/2 before:left-0.5 before:size-6 before:-translate-y-1/2 before:scale-[0.6667] before:rounded-full before:bg-input before:transition-[translate,scale] before:duration-150 before:content-[''] peer-checked:before:translate-x-5 peer-checked:before:scale-100 peer-checked:before:bg-primary-foreground motion-reduce:transition-none motion-reduce:before:transition-none forced-colors:border-[CanvasText] forced-colors:[forced-color-adjust:none] forced-colors:before:bg-[CanvasText] forced-colors:peer-checked:bg-[Highlight] forced-colors:peer-checked:before:bg-[HighlightText] forced-colors:peer-focus-visible:outline-2 forced-colors:peer-focus-visible:outline-offset-2 forced-colors:peer-focus-visible:outline-[Highlight]"
      />
      Show the note behind each answer
    </label>
  );
}
