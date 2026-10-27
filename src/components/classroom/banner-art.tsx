import { Blob, DotGrid, type PopTone } from "@/components/decor/decor";
import type { BannerMotif, ClassTheme } from "@/lib/ui/class-theme";
import { cn } from "@/lib/utils";

/** Two paint colors per class color, picked to pop against it (never the same hue). */
const BLOB_TONES: Record<ClassTheme["key"], [PopTone, PopTone]> = {
  blue: ["yellow", "coral"],
  green: ["yellow", "sky"],
  purple: ["yellow", "mint"],
  teal: ["coral", "yellow"],
  orange: ["sky", "yellow"],
  pink: ["yellow", "sky"],
};

/**
 * The Bold look's paint for a class banner. Render it as a flex item right
 * after the banner's text (the banner is a flex row): it takes the room left
 * beside the text, so the paint never runs behind a line of text or into the
 * text's scrim, however long the class name is. Every shape stays inside this
 * column, bleeding off the banner's top, right and bottom edges only, so no
 * shape is ever cut by a seam; a shape that doesn't fit isn't drawn.
 *
 * - The main blob sits in a square box in the top right corner, as wide as
 *   the column up to a cap, and is sized from that box, so with less room it
 *   shrinks instead of being cut; under 2.75rem of room it's left out.
 * - On a page banner with the room, a second blob rises from the bottom edge
 *   and a white dot grid sits left of the main blob.
 *
 * The column is at -z-20, under the line art and the scrims (both -z-10), so
 * the art's white lines draw over the paint. Decor: hidden in the Calm look,
 * where the line art carries the banner alone.
 */
export function BannerBlobs({ theme, size }: { theme: ClassTheme["key"]; size: "page" | "card" }) {
  const [main, second] = BLOB_TONES[theme];
  return (
    <div aria-hidden data-decor="" className="@container/paint relative -z-20 min-w-0 flex-1 self-stretch">
      <div
        className={cn(
          "absolute top-0 right-0 hidden aspect-square @min-[2.75rem]/paint:block",
          size === "card" ? "w-[min(7rem,100%)]" : "w-[min(9rem,100%)] sm:w-[min(16rem,100%)]"
        )}
      >
        {/* Wider than the box by what bleeds past the right edge, so its left edge stays inside the box. */}
        <Blob
          shape={4}
          tone={main}
          className={
            size === "card"
              ? "-top-[60%] -right-1/2 w-[150%]"
              : "-top-[40%] -right-1/2 w-[150%] sm:-top-[55%] sm:-right-[40%] sm:w-[130%]"
          }
        />
      </div>
      {size === "page" ? (
        <>
          <Blob shape={6} tone={second} className="right-[48%] -bottom-24 hidden w-40 @min-[28rem]/paint:block lg:w-48" />
          <DotGrid
            cols={6}
            rows={3}
            className="top-6 right-[16rem] hidden w-28 fill-white opacity-70 @min-[25rem]/paint:block"
          />
        </>
      ) : null}
    </div>
  );
}

/**
 * Line-art illustrations for class banners (white on the class color), in the
 * spirit of Google Classroom's themed headers. Decorative only.
 */
export function BannerArt({ motif, className }: { motif: BannerMotif; className?: string }) {
  return (
    <svg
      viewBox="0 0 320 160"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {motif === "books" ? (
        <>
          <rect x="150" y="62" width="34" height="86" rx="4" opacity="0.55" />
          <rect x="188" y="44" width="30" height="104" rx="4" opacity="0.7" />
          <path d="M193 64h20M193 72h20" opacity="0.7" />
          <rect x="222" y="74" width="26" height="74" rx="4" opacity="0.45" />
          <path d="M254 146l18-96 26 5-18 96z" opacity="0.6" />
          <path d="M150 148h150" opacity="0.5" />
          <path d="M96 52c18-14 38-14 50 0v58c-12-12-32-12-50 0z" opacity="0.4" />
          <path d="M146 52c12-14 32-14 50 0" opacity="0" />
          <circle cx="66" cy="34" r="6" opacity="0.35" />
          <circle cx="112" cy="132" r="4" opacity="0.35" />
        </>
      ) : motif === "science" ? (
        <>
          <path d="M196 38h28M204 38v34l-30 58a10 10 0 0 0 9 14h54a10 10 0 0 0 9-14l-30-58V38" opacity="0.7" />
          <path d="M186 112h68" opacity="0.5" />
          <circle cx="206" cy="126" r="4" opacity="0.6" />
          <circle cx="228" cy="120" r="3" opacity="0.6" />
          <path d="M128 140c0-40 22-66 54-74-4 34-24 58-54 74z" opacity="0.45" />
          <path d="M128 140c10-24 26-42 46-56" opacity="0.45" />
          <path d="M276 54a14 14 0 1 0 0.1 0" opacity="0.4" />
          <path d="M262 54h28M276 40v28" opacity="0.25" />
          <circle cx="92" cy="40" r="5" opacity="0.35" />
          <circle cx="300" cy="128" r="6" opacity="0.35" />
        </>
      ) : motif === "math" ? (
        <>
          <path d="M160 140l40-80 40 80z" opacity="0.6" />
          <circle cx="262" cy="74" r="26" opacity="0.5" />
          <rect x="112" y="40" width="44" height="44" rx="4" opacity="0.45" />
          <path d="M126 62h16M134 54v16" opacity="0.6" />
          <path d="M240 130h50M240 142h50" opacity="0.5" />
        </>
      ) : (
        <>
          <circle cx="232" cy="80" r="44" opacity="0.45" />
          <circle cx="288" cy="40" r="16" opacity="0.4" />
          <path d="M140 140c30-40 70-50 120-30" opacity="0.5" />
          <circle cx="120" cy="50" r="8" opacity="0.35" />
        </>
      )}
    </svg>
  );
}
