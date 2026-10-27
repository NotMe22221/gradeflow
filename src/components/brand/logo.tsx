import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The mark: a graded page (two lines of writing and a check) on a rounded
 * tile. It follows the viewer's accent and the theme like a filled button:
 * tone 40 with white strokes in light, tone 80 with tone 20 strokes in dark,
 * so it never glares on a dark app bar.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)} fill="none">
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <g className="stroke-primary-foreground" strokeLinecap="round">
        <path d="M9 11h9.5M9 15.5h6" strokeOpacity="0.6" strokeWidth="2.2" />
        <path d="M14.5 21l3.1 3 6.9-7.5" strokeWidth="2.6" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/**
 * The Markwise logo: the mark, then the wordmark in the heavy display face,
 * sized for a 64px app bar.
 *
 * It fits whatever room the bar leaves it and never pushes neighbours out of
 * the bar. The link starts at the mark's width and grows into free space, up
 * to its natural width. When the room runs out, the wordmark row wraps onto a
 * clipped second line: the wordmark goes and the mark always stays. (The empty first item makes the wordmark wrap as well, since
 * a flex line always keeps its first item.)
 */
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label="Markwise"
      className={cn(
        "flex h-10 max-w-max min-w-0 shrink-0 grow basis-8 items-center rounded-xl pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        className
      )}
    >
      <LogoMark />
      <span aria-hidden className="flex h-8 min-w-0 flex-auto flex-wrap items-center overflow-hidden">
        <span className="h-8 w-0" />
        <span className="pl-2.5 font-display text-[1.25rem] leading-8 font-extrabold tracking-[-0.035em] whitespace-nowrap text-foreground min-[37.5rem]:text-[1.375rem]">
          Markwise
        </span>
      </span>
    </Link>
  );
}
