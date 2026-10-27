import { Blob, DotGrid, type PopTone } from "@/components/decor/decor";
import type { BannerMotif, ClassTheme } from "@/lib/ui/class-theme";

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
 * The Bold look's paint for a class banner: a big blob bleeding off the top
 * right corner, a smaller one rising from the bottom edge, and (on the page
 * banner) a white dot grid. Behind the line art and behind the banner text's
 * scrim, so the white text always sits on the class color. Decor: hidden in
 * the Calm look, where the line art carries the banner alone.
 */
export function BannerBlobs({ theme, size }: { theme: ClassTheme["key"]; size: "page" | "card" }) {
  const [main, second] = BLOB_TONES[theme];
  if (size === "card") {
    return (
      <>
        <Blob shape={4} tone={main} className="-top-14 -right-12 w-36" />
        <Blob shape={6} tone={second} className="right-28 -bottom-12 w-20" />
      </>
    );
  }
  return (
    <>
      <Blob shape={4} tone={main} className="-top-16 -right-14 w-36 sm:-top-36 sm:-right-24 sm:w-80" />
      <Blob shape={6} tone={second} className="right-[40%] -bottom-24 hidden w-40 sm:block lg:w-48" />
      <DotGrid cols={6} rows={3} className="top-6 right-[28%] hidden w-28 fill-white opacity-70 sm:block" />
    </>
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
