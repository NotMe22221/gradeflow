import Link from "next/link";

import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={cn("size-7 shrink-0", className)}
      fill="none"
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M9 11.5h9M9 16h6"
        stroke="white"
        strokeOpacity="0.55"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
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

/** The quiet "AI" tag that sits after the wordmark. */
export function AiTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[18px] items-center rounded-[5px] bg-primary-soft px-1.5 text-[11px] leading-none font-semibold tracking-wide text-primary-soft-foreground ring-1 ring-primary/15 ring-inset",
        className
      )}
    >
      AI
    </span>
  );
}

/**
 * The GradeSmart AI logo: mark, "GradeSmart" wordmark, and a small "AI" tag.
 *
 * It fits whatever room the bar leaves it and never pushes neighbours out of
 * the bar. The link starts at the mark's width and grows into free space, up
 * to its natural width. When the room runs out, the wordmark row wraps onto a
 * clipped second line: first the "AI" tag goes, then the wordmark, and the
 * mark always stays. (The empty first item makes the wordmark wrap as well,
 * since a flex line always keeps its first item.) On a 390px phone, the
 * teacher top bar shows the mark and "GradeSmart" next to the menu button,
 * "Demo grader" pill, and avatar; from about 414px it shows the full logo.
 */
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label="GradeSmart AI"
      className={cn(
        "flex max-w-max min-w-0 shrink-0 grow basis-7 items-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
        className
      )}
    >
      <LogoMark />
      <span aria-hidden className="flex h-7 min-w-0 flex-auto flex-wrap items-center overflow-hidden">
        <span className="h-7 w-0" />
        <span className="pl-2 text-[14px] font-semibold tracking-tight whitespace-nowrap text-foreground sm:text-[15px]">
          GradeSmart
        </span>
        <AiTag className="ml-1.5" />
      </span>
    </Link>
  );
}
