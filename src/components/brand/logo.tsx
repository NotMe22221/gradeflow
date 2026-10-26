import Link from "next/link";

import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)} fill="none">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M9 11.5h9M9 16h6" stroke="white" strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M14.5 21.2l3.2 3.1 6.8-7.6"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The GradeSmart AI logo: the mark, then a two-tone wordmark in the display
 * face ("GradeSmart" in ink, "AI" in muted gray), sized for a 64px app bar
 * the way product names sit in Material top bars.
 *
 * It fits whatever room the bar leaves it and never pushes neighbours out of
 * the bar. The link starts at the mark's width and grows into free space, up
 * to its natural width. When the room runs out, the wordmark row wraps onto a
 * clipped second line: first "AI" goes, then "GradeSmart", and the mark
 * always stays. (The empty first item makes the wordmark wrap as well, since
 * a flex line always keeps its first item.) A 390px phone shows the full
 * logo next to the menu button, engine pill, and avatar.
 */
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label="GradeSmart AI"
      className={cn(
        "flex h-10 max-w-max min-w-0 shrink-0 grow basis-8 items-center rounded-full pr-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
        className
      )}
    >
      <LogoMark />
      <span aria-hidden className="flex h-8 min-w-0 flex-auto flex-wrap items-center overflow-hidden">
        <span className="h-8 w-0" />
        <span className="pl-2.5 font-display text-[1.1875rem] leading-8 font-semibold tracking-[-0.01em] whitespace-nowrap text-foreground sm:text-[1.3125rem]">
          GradeSmart
        </span>
        <span className="pl-[0.3em] font-display text-[1.1875rem] leading-8 font-normal whitespace-nowrap text-muted-foreground sm:text-[1.3125rem]">
          AI
        </span>
      </span>
    </Link>
  );
}
