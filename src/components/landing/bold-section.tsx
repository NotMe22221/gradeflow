import { cn } from "@/lib/utils";

/*
 * Shared pieces for the landing page's middle sections in the Bold look: the
 * band fills, the section rhythm and the organic number stickers. Headings
 * come from SectionIntro (section-intro.tsx; tone="band" on a band), and a
 * heading SectionIntro can't hold ends in Period onBand (decor/period.tsx).
 * Bands turn plain (bg-secondary) and decor disappears in the Calm look, so
 * everything here still reads there.
 */

export type BandTone = "yellow" | "coral" | "mint" | "sky" | "pink" | "lilac";

/** Band fills for sections and panels. Text on them is text-band-foreground, never muted or primary. */
export const BAND_BG: Record<BandTone, string> = {
  yellow: "bg-band-yellow",
  coral: "bg-band-coral",
  mint: "bg-band-mint",
  sky: "bg-band-sky",
  pink: "bg-band-pink",
  lilac: "bg-band-lilac",
};

/** Vertical rhythm for a Bold landing section: roomier than the app's, so the type and color can breathe. */
export const BOLD_SECTION_Y = "py-20 sm:py-28";

/** Organic outlines, like the paint blobs, for the number stickers. */
const STICKER_SHAPES = [
  "rounded-[58%_42%_55%_45%/48%_56%_44%_52%]",
  "rounded-[44%_56%_46%_54%/56%_44%_56%_44%]",
  "rounded-[52%_48%_38%_62%/45%_60%_40%_55%]",
  "rounded-[60%_40%_50%_50%/50%_50%_60%_40%]",
] as const;

/**
 * A big step number on a band-colored paint shape. Hidden from screen
 * readers: the step's own text says which step it is. Size it with classes
 * (`size-16 text-[2.25rem]`).
 */
export function NumberSticker({
  value,
  tone,
  shape = 0,
  className,
}: {
  value: number;
  tone: BandTone;
  shape?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "tabular inline-flex shrink-0 items-center justify-center font-display leading-none font-extrabold tracking-[-0.04em] text-band-foreground",
        BAND_BG[tone],
        STICKER_SHAPES[shape % STICKER_SHAPES.length],
        className
      )}
    >
      {value}
    </span>
  );
}
