// The Bold look's decoration: paint blobs, X grids, dot grids, squiggles and
// rings, after flat "paint and pattern" poster art. Server components, no
// state. Every piece is aria-hidden, ignores the pointer, never prints, and
// disappears in the Calm look (globals.css, [data-decor]).
//
// Place decor inside a `relative isolate` parent, absolutely, with -z-10 so
// it sits behind the parent's content but above its background. Keep it at
// the edges: never under body text, form fields, papers or grades.

import { cn } from "@/lib/utils";

export const POP_TONES = ["yellow", "coral", "mint", "sky", "pink", "lilac"] as const;
export type PopTone = (typeof POP_TONES)[number];

const FILL: Record<PopTone, string> = {
  yellow: "fill-pop-yellow",
  coral: "fill-pop-coral",
  mint: "fill-pop-mint",
  sky: "fill-pop-sky",
  pink: "fill-pop-pink",
  lilac: "fill-pop-lilac",
};

const STROKE: Record<PopTone, string> = {
  yellow: "stroke-pop-yellow",
  coral: "stroke-pop-coral",
  mint: "stroke-pop-mint",
  sky: "stroke-pop-sky",
  pink: "stroke-pop-pink",
  lilac: "stroke-pop-lilac",
};

/**
 * Organic paint-blob outlines, generated once in a 200 x 200 box. A few
 * overshoot it by up to 4 units, so the SVG's viewBox has a 4-unit margin:
 * an SVG clips at its own box, which would cut a straight edge into a blob.
 */
const BLOB_PATHS = [
  "M198 91.1C198.3 111.5 183.4 153.3 171.7 171.2C160.1 189 147.1 197.6 128 198C109 198.4 78.5 181.2 57.5 173.5C36.5 165.8 9.4 171.5 2 151.6C-5.4 131.8 5.6 76.2 13 54.2C20.4 32.1 29.1 28 46.2 19.3C63.3 10.6 95.1 -2.9 115.7 2C136.3 6.9 155.9 34.1 169.7 49C183.4 63.8 197.7 70.8 198 91.1Z",
  "M198 100.3C198.6 119.5 199.1 150.7 185 167C170.9 183.2 138.6 194.8 113.4 198C88.2 201.2 52.5 199.5 33.9 186.4C15.3 173.3 0.3 141.6 2 119.2C3.7 96.9 28.9 72 44.4 52.4C59.9 32.9 72.2 2.1 95.1 2C117.9 1.9 164.4 35.4 181.5 51.7C198.7 68.1 197.4 81.1 198 100.3Z",
  "M189.3 104.1C185.3 122 183.6 153.4 174 168.4C164.3 183.3 147.9 189 131.3 193.9C114.8 198.9 96.2 202.7 74.6 198C53.1 193.3 14.2 182.1 2 165.7C-10.1 149.2 -0.3 119.9 2 99.4C4.3 79 3.6 55.4 16 43.1C28.3 30.9 58.5 32.7 76.2 25.9C93.8 19 101.3 -3.8 121.6 2C141.9 7.8 186.7 43.9 198 60.9C209.3 77.9 193.3 86.1 189.3 104.1Z",
  "M198 98.4C197.7 123.7 186.1 174.8 163.8 191.4C141.6 208 91.2 205.4 64.3 198C37.3 190.6 10.8 169.3 2 146.8C-6.8 124.3 -1.2 87.2 11.5 63C24.1 38.9 52.2 5.9 77.9 2C103.6 -1.9 145.6 23.6 165.6 39.6C185.7 55.7 198.3 73.2 198 98.4Z",
  "M198 95.3C197.3 110.9 194.1 123.5 186 139.8C177.9 156.2 164.3 183.6 149.3 193.3C134.3 203 112.3 198.6 96 198C79.8 197.4 67.4 201.3 51.7 189.9C36 178.6 9.5 151.4 2 130.1C-5.5 108.7 2.4 78 6.5 61.6C10.6 45.3 12.2 40.3 26.7 31.9C41.2 23.5 75.7 16.2 93.5 11.2C111.3 6.2 117.3 -3.8 133.4 2C149.6 7.8 179.6 30.5 190.4 46.1C201.1 61.6 198.7 79.6 198 95.3Z",
  "M198 100.3C196.8 119 173 154.3 158.2 170.6C143.4 186.9 127.3 196.3 109.2 198C91.1 199.7 66.1 189.1 49.9 180.7C33.6 172.4 19.6 164.8 11.6 147.7C3.7 130.6 -3.4 99.5 2 78C7.4 56.6 23.9 31.5 44.1 18.8C64.3 6.1 103.1 -4.6 123.3 2C143.6 8.6 153.1 42 165.5 58.4C178 74.8 199.2 81.6 198 100.3Z"
] as const;

export type BlobShape = 1 | 2 | 3 | 4 | 5 | 6;

type DecorProps = { className?: string };

const decorProps = { "aria-hidden": true, focusable: false, "data-decor": "" } as const;

/**
 * A flat paint blob. Size and place it with classes (`absolute -top-24
 * -right-16 w-[28rem]`). `float` drifts it slowly up and down (off with
 * reduced motion).
 */
export function Blob({
  shape = 1,
  tone = "yellow",
  float = false,
  className,
}: DecorProps & { shape?: BlobShape; tone?: PopTone; float?: boolean }) {
  return (
    <svg
      {...decorProps}
      viewBox="-4 -4 208 208"
      className={cn("pointer-events-none absolute -z-10 opacity-(--decor-opacity)", float && "motion-safe:animate-float", className)}
    >
      <path d={BLOB_PATHS[shape - 1]} className={FILL[tone]} />
    </svg>
  );
}

/** A grid of hand-drawn X marks (the poster's "xxx" pattern). */
export function XGrid({ cols = 6, rows = 4, className }: DecorProps & { cols?: number; rows?: number }) {
  const cell = 30;
  return (
    <svg
      {...decorProps}
      viewBox={`0 0 ${cols * cell} ${rows * cell}`}
      className={cn("pointer-events-none absolute -z-10 stroke-pop-ink", className)}
      style={{ aspectRatio: `${cols} / ${rows}` }}
    >
      {Array.from({ length: rows * cols }, (_, index) => {
        const x = (index % cols) * cell + 9;
        const y = Math.floor(index / cols) * cell + 9;
        return <path key={index} d={`M${x} ${y}l12 12M${x + 12} ${y}l-12 12`} strokeWidth={3} strokeLinecap="round" fill="none" />;
      })}
    </svg>
  );
}

/** A grid of round dots. */
export function DotGrid({ cols = 10, rows = 6, className }: DecorProps & { cols?: number; rows?: number }) {
  const cell = 20;
  return (
    <svg
      {...decorProps}
      viewBox={`0 0 ${cols * cell} ${rows * cell}`}
      className={cn("pointer-events-none absolute -z-10 fill-pop-ink", className)}
      style={{ aspectRatio: `${cols} / ${rows}` }}
    >
      {Array.from({ length: rows * cols }, (_, index) => (
        <circle key={index} cx={(index % cols) * cell + 10} cy={Math.floor(index / cols) * cell + 10} r={2.6} />
      ))}
    </svg>
  );
}

/** A thick wavy stroke. */
export function Squiggle({ tone = "pink", waves = 3, className }: DecorProps & { tone?: PopTone; waves?: number }) {
  const d = Array.from({ length: waves }, (_, i) => `${i === 0 ? "M4 24" : ""}c14-18 28-18 42 0s28 18 42 0`).join("");
  return (
    <svg
      {...decorProps}
      viewBox={`0 0 ${waves * 84 + 8} 40`}
      className={cn("pointer-events-none absolute -z-10", STROKE[tone], className)}
    >
      <path d={d} fill="none" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A thick ring outline. */
export function Ring({ tone = "sky", className }: DecorProps & { tone?: PopTone }) {
  return (
    <svg {...decorProps} viewBox="0 0 40 40" className={cn("pointer-events-none absolute -z-10", STROKE[tone], className)}>
      <circle cx={20} cy={20} r={15} fill="none" strokeWidth={6} />
    </svg>
  );
}
