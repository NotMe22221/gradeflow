import { classInitial, classTheme } from "@/lib/ui/class-theme";
import { cn } from "@/lib/utils";

/**
 * Rough advance widths in Roboto Medium, in em, rounded up a little: wide
 * capitals, "I", digits, and everything else.
 */
function charWidthEm(char: string): number {
  if (/[MWÆŒЖШЩЮФΩΨ]/u.test(char)) return 0.92;
  if (/[IІΙ]/u.test(char)) return 0.3;
  if (/\p{Nd}/u.test(char)) return 0.58;
  return 0.68;
}

/** Share of the circle's width the initials may take, so they stay clear of the edge. */
const FIT = 0.72;

/**
 * Largest font size, in `cqi` (percent of the circle's width), at which
 * `initials` still fit the circle. The avatar uses the smaller of this and
 * the caller's text size, so a single letter keeps the caller's size and two
 * wide letters ("MW") shrink to fit even a 16px circle.
 */
export function initialsFitCqi(initials: string): number {
  let width = 0;
  for (const char of initials) width += charWidthEm(char);
  return Math.floor((FIT / Math.max(width, 0.3)) * 1000) / 10;
}

/**
 * Colored circle with the class initials ("E1", "ES"), as in Classroom's
 * class list. Two characters, so classes that share a first letter still look
 * different where the avatar stands alone (the navigation rail). Uses the
 * class accent: the classic color with white in light, a lighter tone with
 * dark text in dark, so it stands out on dark surfaces without glare.
 */
export function ClassAvatar({ name, className }: { name: string; className?: string }) {
  const theme = classTheme({ name });
  const initials = classInitial(name);
  return (
    <span
      aria-hidden
      className={cn(
        // A size container: the initials scale with the circle (see initialsFitCqi).
        "@container inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
        className
      )}
      style={{ backgroundColor: theme.accent, color: theme.onAccent }}
    >
      <span className="leading-none" style={{ fontSize: `min(1em, ${initialsFitCqi(initials)}cqi)` }}>
        {initials}
      </span>
    </span>
  );
}
